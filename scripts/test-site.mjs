import { createRequire } from 'node:module';
import { lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assembleSite, assertNoSymlinks, exportEnginePackage } from './lib/site-packages.mjs';
import { loadPublicEnvironment, parseOptions, readSiteDescriptor, runChild, verifyEnginePin } from './run-site.mjs';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node test-site.mjs --manifest PATH [--engine EXPORTED_ENGINE] [--source-root APP_SRC] [--assemble-only]';
const slash = value => value.replace(/\\/g, '/');

async function exists(filename) {
  try { await lstat(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function ownTests(root, relative = '') {
  if (!await exists(root)) return [];
  const selected = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error('App test namespace cannot contain symlinks');
    if (entry.isDirectory()) selected.push(...await ownTests(root, name));
    else if (entry.isFile() && /\.test\.(?:js|jsx)$/.test(entry.name)) selected.push(name);
  }
  return selected.sort();
}

export async function testSite(options, cwd = process.cwd()) {
  cwd = path.resolve(cwd);
  await verifyEnginePin(cwd, { engineOverride: Boolean(options.engine) });
  const manifestPath = path.resolve(cwd, options.manifest);
  const descriptor = await readSiteDescriptor(manifestPath);
  const sourceRoot = path.resolve(cwd, options.sourceRoot || 'src');
  const namespace = path.join(sourceRoot, 'sites', descriptor.id);
  await assertNoSymlinks(namespace);
  const testFiles = await ownTests(namespace);
  const tempRoot = path.join(cwd, 'temp');
  await assertNoSymlinks(tempRoot);
  await mkdir(tempRoot, { recursive: true });
  const workspace = await mkdtemp(path.join(tempRoot, 'test-site-'));
  const engineRoot = options.engine ? path.resolve(cwd, options.engine)
    : await exists(path.join(ownRoot, 'engine.json')) ? ownRoot
      : (await exportEnginePackage({ repoRoot: ownRoot, outputRoot: path.join(workspace, 'engine') })).root;
  const assembly = await assembleSite({ engineRoot, manifestPath, outputRoot: path.join(workspace, 'app') });
  const engine = JSON.parse(await readFile(path.join(engineRoot, 'engine.json'), 'utf8'));
  const components = [
    ...engine.core,
    ...descriptor.engineFeatures.flatMap(feature => engine.features[feature]),
    ...descriptor.files,
  ].filter(file => file.component);
  const loaders = [
    '// Test-only literal lazy factories preserve per-suite jest.mock behavior.',
    'export default {',
    ...components.map(file => `  ${JSON.stringify(file.component)}: () => require(${JSON.stringify(`./${file.target.slice(4)}`)}).default,`),
    '};', '',
  ].join('\n');
  await writeFile(path.join(assembly.root, 'src/component-loaders.js'), loaders);
  await writeFile(path.join(assembly.root, 'src/setupTests.js'), [
    "import { registerComponentLoaders } from './components/utils/component-registry';",
    "import componentLoaders from './component-loaders';",
    'registerComponentLoaders(componentLoaders);',
    'globalThis.IS_REACT_ACT_ENVIRONMENT = true;', '',
  ].join('\n'));
  for (const filename of testFiles) {
    const destination = path.join(assembly.root, 'src', 'sites', descriptor.id, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(path.join(namespace, filename)));
  }
  const result = {
    schemaVersion: 1, site: assembly.site, engineVersion: assembly.engineVersion, engineFingerprint: assembly.engineFingerprint,
    assemblyRoot: assembly.root, engineRoot, selectedFeatures: assembly.selectedFeatures,
    productionInputCount: assembly.inputs.length,
    testFiles: testFiles.map(filename => `src/sites/${descriptor.id}/${slash(filename)}`),
    status: options.assembleOnly ? 'assembled' : testFiles.length ? 'pending' : 'no-app-specific-tests',
  };
  const proofPath = path.join(workspace, 'test-assembly.json');
  const save = () => writeFile(proofPath, `${JSON.stringify(result, null, 2)}\n`);
  await save();
  if (!options.assembleOnly && testFiles.length) {
    const consumerRequire = createRequire(path.join(cwd, 'package.json'));
    const env = { ...await loadPublicEnvironment(cwd), NODE_ENV: 'test' };
    env.CI ??= 'true';
    try {
      await runChild(consumerRequire.resolve('react-scripts/scripts/test.js'), ['--watchAll=false', '--runInBand'], assembly.root, env);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      await save();
      throw error;
    }
    await save();
  }
  if (!testFiles.length) console.log(`No app-specific tests for ${assembly.site}; isolated assembly verified.`);
  console.log(JSON.stringify({ ...result, proofPath }));
  return { ...result, proofPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const values = process.argv.slice(2);
    const assembleOnly = values.includes('--assemble-only');
    if (values.filter(value => value === '--assemble-only').length > 1) throw new Error(usage);
    const options = parseOptions(values.filter(value => value !== '--assemble-only'), { '--manifest': 'manifest', '--engine': 'engine', '--source-root': 'sourceRoot' }, usage);
    if (options.help) console.log(usage);
    else await testSite({ ...options, assembleOnly });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
