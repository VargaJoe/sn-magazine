#!/usr/bin/env node
// Local fixture preparation through native SenseNet content operations.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';

const help = `Usage: node deploy/local/configure-presentation.mjs --site /Root/Content/<site>
  --theme editorial|graphic --assets /Root/Content/<existing-folder> [--apply]
Defaults to a read-only dry run. --apply saves a private snapshot, copies missing
shared Layouts with their widgets, uploads CSS, and sets site Layout references.`;
const base = new URL('./', import.meta.url);
const options = {};
let secret = '', snapshotUrl, snapshot;
const fail = (message) => { throw new Error(message); };
function contentPath(value, site = false) {
  if (typeof value !== 'string' || !/^\/Root\/Content\/[\p{L}\p{N}_(). -]+(?:\/[\p{L}\p{N}_(). -]+)*$/u.test(value) ||
      value.split('/').some((part) => part === '.' || part === '..' || part !== part.trim()) ||
      (site && (value.split('/').length !== 4 || value.endsWith('/(layout)')))) {
    fail('Use a literal /Root/Content path without URLs, query strings, escapes or traversal; --site names one direct child.');
  }
  return value;
}
const hash = (text) => createHash('sha256').update(text).digest('hex');
function refs(page) {
  const values = Array.isArray(page.Stylesheets) ? page.Stylesheets : page.Stylesheets?.results;
  if (!Array.isArray(values) || values.some((ref) => typeof ref?.Path !== 'string')) {
    fail(`Stylesheets are not fully expanded on ${page.Path}; install the public app schema first.`);
  }
  return values.map((ref) => ref.Path);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log(help); return; }
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (!['--site', '--theme', '--assets', '--apply'].includes(name) || options[name] !== undefined) fail(help);
    options[name] = name === '--apply' ? true : args[++index];
    if (!options[name] || (name !== '--apply' && options[name].startsWith('--'))) fail(help);
  }
  const site = contentPath(options['--site'], true), assets = contentPath(options['--assets']);
  const theme = options['--theme'];
  if (!['editorial', 'graphic'].includes(theme)) fail(help);
  const [settingsText, environment, css] = await Promise.all([
    readFile(new URL('runtime/import.json', base), 'utf8'),
    readFile(new URL('runtime/docker.env', base), 'utf8'),
    readFile(new URL(`themes/${theme}.css`, base), 'utf8'),
  ]);
  let repositoryUrl;
  try { repositoryUrl = new URL(JSON.parse(settingsText).repositoryWriter.url); }
  catch { fail('Invalid local runtime/import.json writer URL; run deploy/local/start.ps1 first.'); }
  if (!['http:', 'https:'].includes(repositoryUrl.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(repositoryUrl.hostname) ||
      repositoryUrl.username || repositoryUrl.password || repositoryUrl.search || repositoryUrl.hash ||
      repositoryUrl.pathname !== '/') fail('The configured writer must be a loopback HTTP(S) origin.');
  secret = environment.match(/^LOCAL_API_KEY=(.+)\r?$/m)?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2') || '';
  if (!secret || /[\r\n]/.test(secret)) fail('Missing local API key; run deploy/local/start.ps1 first.');
  const guardedFetch = async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).origin !== repositoryUrl.origin) fail('Blocked a request outside the configured local repository origin.');
    const headers = new Headers(request.headers);
    headers.set('apikey', secret);
    if (request.body && headers.get('content-type')?.startsWith('text/plain')) headers.set('content-type', 'application/json');
    return fetch(request, { headers, redirect: 'error', signal: AbortSignal.timeout(45000) });
  };
  const { Repository } = createRequire(import.meta.url)('@sensenet/client-core');
  globalThis.File ??= File;
  const repo = new Repository({ repositoryUrl: repositoryUrl.origin }, guardedFetch);
  const pageOptions = { select: 'all', expand: ['Stylesheets'] };
  const load = async (path, page = false) => {
    try { return (await repo.load({ idOrPath: path, oDataOptions: page ? pageOptions : { select: 'all' } })).d; }
    catch (error) { if (error.statusCode === 404) return null; throw error; }
  };
  const layouts = async (path) => {
    const { d } = await repo.loadCollection({ path: '/Root', oDataOptions: {
      ...pageOptions, query: `Type:Layout AND InTree:"${path}"`, top: 5000,
      enableautofilters: 'off', enablelifespanfilter: 'off',
    } });
    if (!Array.isArray(d?.results) || Number(d.__count) > d.results.length) fail(`Incomplete Layout listing under ${path}.`);
    return d.results;
  };
  const sharedPath = '/Root/Content/(layout)', targetFolder = `${site}/(layout)`;
  const [siteContent, assetFolder, sharedFolder, localFolder, sources, existing] = await Promise.all([
    load(site), load(assets), load(sharedPath), load(targetFolder), layouts(sharedPath), layouts(site),
  ]);
  if (!siteContent?.IsFolder || !assetFolder?.IsFolder || !sharedFolder?.IsFolder ||
      (localFolder && !localFolder.IsFolder)) fail('The site, explicit assets folder and public shared Layout folder must exist as folders.');
  if (!sources.length) fail('No shared Layouts found; install the public app baseline first.');
  const copies = [];
  for (const source of sources) {
    if (source.Path.slice(sharedPath.length + 1).includes('/')) fail('Nested shared Layouts need explicit review; this helper supports the current flat baseline.');
    const targetPath = `${targetFolder}/${source.Name}`;
    const target = await load(targetPath);
    if (target && target.Type !== 'Layout') fail(`A non-Layout already occupies ${targetPath}.`);
    if (!target) copies.push({ sourcePath: source.Path, targetPath, source });
  }
  const cssHash = hash(css), fileName = `local-${theme}-${cssHash.slice(0, 12)}.css`, filePath = `${assets}/${fileName}`;
  const asset = await load(filePath);
  const verifyCss = async () => {
    const response = await fetch(new URL(filePath, repositoryUrl), {
      redirect: 'error', signal: AbortSignal.timeout(45000),
    });
    if (!response.ok || !/^text\/css(?:;|$)/i.test(response.headers.get('content-type') || '') ||
        hash(await response.text()) !== cssHash) fail(`Anonymous CSS verification failed at ${filePath}; no existing file was overwritten.`);
  };
  if (asset) { if (asset.Type !== 'File') fail(`A non-File already occupies ${filePath}.`); await verifyCss(); }
  const replacement = (page) => [...refs(page).filter((path) => !(path.startsWith(`${assets}/`) &&
    /^local-(editorial|graphic)-[a-f0-9]+\.css$/.test(path.slice(assets.length + 1)))), filePath];
  const planned = [...existing, ...copies.map(({ source, targetPath }) => ({ ...source, Path: targetPath }))];
  const patches = planned.map((page) => ({ path: page.Path, pageTemplate: page.PageTemplate,
    before: refs(page), after: replacement(page) }));
  console.log(`${options['--apply'] ? 'Apply' : 'Dry run'}: ${copies.length} missing shared Layout(s), ${patches.length} site Layout(s), ${asset ? 'reuse' : 'upload'} ${fileName}.`);
  if (!options['--apply']) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  snapshotUrl = new URL(`runtime/presentation/${timestamp}-${site.split('/').at(-1)}.json`, base);
  snapshot = { timestamp, site, assets, theme, filePath, cssHash, status: 'planned',
    siteContent, assetFolder, sharedFolder, localFolder, sourceLayouts: sources, siteLayouts: existing,
    assetBefore: asset, createLayoutFolder: !localFolder, copies: copies.map(({ sourcePath, targetPath }) => ({ sourcePath, targetPath })), patches, completed: [] };
  await mkdir(new URL('runtime/presentation/', base), { recursive: true });
  await writeFile(snapshotUrl, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  if (!localFolder) await repo.post({ parentPath: site, contentType: 'Folder', content: { Name: '(layout)' } });
  for (const copy of copies) {
    if (await load(copy.targetPath)) fail(`Copy target appeared after planning: ${copy.targetPath}.`);
    const response = await repo.copy({ idOrPath: [copy.sourcePath], targetPath: targetFolder });
    const batch = response.d ?? response;
    if (Number(batch.errorCount || response.errorCount || 0) || batch.errors?.length) fail(`Native CopyBatch reported errors for ${copy.sourcePath}.`);
    const copied = await load(copy.targetPath, true);
    if (copied?.Type !== 'Layout' || copied.PageTemplate !== copy.source.PageTemplate ||
        JSON.stringify(refs(copied)) !== JSON.stringify(refs(copy.source))) fail(`Copied Layout verification failed: ${copy.targetPath}.`);
    snapshot.completed.push({ copied: copy.targetPath });
  }
  if (!asset) await repo.upload.textAsFile({ parentPath: assets, fileName, text: css,
    binaryPropertyName: 'Binary', contentTypeName: 'File', overwrite: false });
  await verifyCss();
  for (const patch of patches) {
    const current = await load(patch.path, true);
    if (current?.PageTemplate !== patch.pageTemplate || JSON.stringify(refs(current)) !== JSON.stringify(patch.before)) {
      fail(`Layout changed after planning; stopped to preserve edits: ${patch.path}.`);
    }
    if (JSON.stringify(patch.before) !== JSON.stringify(patch.after)) {
      await repo.patch({ idOrPath: patch.path, content: { Stylesheets: patch.after } });
    }
    const verified = await load(patch.path, true);
    if (verified?.PageTemplate !== patch.pageTemplate || JSON.stringify(refs(verified)) !== JSON.stringify(patch.after)) fail(`Stylesheet verification failed: ${patch.path}.`);
    snapshot.completed.push({ verified: patch.path });
  }
  snapshot.status = 'verified';
  await writeFile(snapshotUrl, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Verified ${patches.length} Layout(s). Private pre-write snapshot saved under deploy/local/runtime/presentation/.`);
}
main().catch(async (error) => {
  if (snapshot && snapshotUrl) {
    snapshot.status = 'failed';
    await writeFile(snapshotUrl, JSON.stringify(snapshot, null, 2) + '\n').catch(() => {});
  }
  const message = String(error?.message || 'Unknown failure').replaceAll(secret || '\0', '[redacted]');
  console.error(`Presentation configuration failed: ${message}`);
  process.exitCode = 1;
});
