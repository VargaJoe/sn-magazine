import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertNoSymlinks } from './lib/site-packages.mjs';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node run-site.mjs --manifest PATH [--engine EXPORTED_ENGINE] [--initial-header PATH]';
const publicKey = /^(?:REACT_APP_[A-Z0-9_]+|CI|GENERATE_SOURCEMAP)$/;

function gitCommit(specification) {
  if (typeof specification !== 'string' || !/^(?:git(?:\+[^:]+)?:|ssh:|github:|gitlab:|bitbucket:|gist:|git@|https?:\/\/[^#]+\.git(?:#|$)|[^\s/:]+\/[^\s/#]+#)/i.test(specification)) return null;
  return /#([a-f0-9]{40})$/i.exec(specification)?.[1].toLowerCase() || null;
}

// npm can retain an older Git resolution when only a same-version package's pin
// changes. Check the installed lock record, rather than trusting the root spec.
export async function verifyEnginePin(cwd, { engineOverride = false } = {}) {
  const ownPackage = JSON.parse(await readFile(path.join(ownRoot, 'package.json'), 'utf8'));
  const name = ownPackage.name;
  if (typeof name !== 'string' || !name) throw new Error('Engine package name is missing');
  const packagePath = path.join(cwd, 'package.json');
  await assertNoSymlinks(packagePath);
  const consumer = JSON.parse(await readFile(packagePath, 'utf8'));
  const groups = ['dependencies', 'devDependencies', 'optionalDependencies'];
  const declarations = groups.filter(group => Object.hasOwn(consumer[group] || {}, name));
  if (!declarations.length && engineOverride) return null;
  const specification = consumer[declarations[0]]?.[name];
  const commit = gitCommit(specification);
  if (!commit || declarations.some(group => consumer[group][name] !== specification)) {
    throw new Error(`Engine dependency ${name} must use one Git URL pinned to a full 40-character commit SHA; mutable refs are not allowed`);
  }
  const lockPath = path.join(cwd, 'package-lock.json');
  await assertNoSymlinks(lockPath);
  let lock;
  try { lock = JSON.parse(await readFile(lockPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Engine Git pin check requires package-lock.json for ${name}`);
    throw error;
  }
  const installed = lock.packages?.[`node_modules/${name}`];
  if (!installed || (installed.name !== undefined && installed.name !== name)) throw new Error(`Engine lock is missing a matching installed package record for ${name}`);
  const installedCommit = gitCommit(installed.resolved);
  if (installedCommit !== commit) throw new Error(`Engine lock mismatch for ${name}: installed commit does not match the declared Git SHA; regenerate package-lock.json before building or testing`);
  if (declarations.some(group => lock.packages?.['']?.[group]?.[name] !== specification)) {
    throw new Error(`Engine lock root declaration for ${name} differs from package.json; regenerate package-lock.json before building or testing`);
  }
  return { name, commit };
}

export function parseOptions(values, allowed, help) {
  if (values.length === 1 && ['--help', '-h'].includes(values[0])) return { help: true };
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!Object.hasOwn(allowed, key) || Object.hasOwn(options, allowed[key])) throw new Error(help);
    const value = values[++index];
    if (!value || value.startsWith('--')) throw new Error(help);
    options[allowed[key]] = value;
  }
  if (!options.manifest) throw new Error(help);
  return options;
}

async function environmentFile(filename, optional) {
  await assertNoSymlinks(filename);
  let content;
  try {
    if (!(await lstat(filename)).isFile()) throw new Error('Public environment input must be a regular file');
    content = await readFile(filename, 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') return {};
    throw error;
  }
  const values = {};
  for (const [index, raw] of content.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || !publicKey.test(match[1])) throw new Error(`Only public frontend environment keys are allowed in ${path.basename(filename)}:${index + 1}`);
    let value = match[2];
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      const end = value.lastIndexOf(quote);
      if (end === 0 || !/^\s*(?:#.*)?$/.test(value.slice(end + 1))) throw new Error(`Invalid quoted public environment value in ${path.basename(filename)}:${index + 1}`);
      value = value.slice(1, end);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else value = value.replace(/\s+#.*$/, '').trim();
    values[match[1]] = value;
  }
  return values;
}

// All changes are confined to the child environment. Existing caller variables win.
export async function loadPublicEnvironment(cwd, inherited = process.env, initialHeader) {
  const example = await environmentFile(path.join(cwd, '.env.example'), false);
  const local = await environmentFile(path.join(cwd, '.env'), true);
  const env = { ...example, ...local, ...inherited };
  delete env.READER_INITIAL_HEADER_CONFIG;
  if (initialHeader) env.READER_INITIAL_HEADER_CONFIG = path.resolve(cwd, initialHeader);
  return env;
}

export async function readSiteDescriptor(manifestPath) {
  await assertNoSymlinks(manifestPath);
  const descriptor = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (descriptor?.schemaVersion !== 1 || !/^[a-z][a-z0-9-]*$/.test(descriptor.id || '')) throw new Error('Invalid site descriptor schema/id');
  return descriptor;
}

export function runChild(filename, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = fork(filename, args, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Consumer process failed (${signal || code}): ${path.basename(filename)}`)));
  });
}

export async function runSite(options, cwd = process.cwd()) {
  cwd = path.resolve(cwd);
  await verifyEnginePin(cwd, { engineOverride: Boolean(options.engine) });
  const manifestPath = path.resolve(cwd, options.manifest);
  const descriptor = await readSiteDescriptor(manifestPath);
  const env = await loadPublicEnvironment(cwd, process.env, options.initialHeader);
  if (options.initialHeader && descriptor.allowInitialHeader !== true) throw new Error('This consumer does not allow an initial header');
  const siteRoot = path.join(cwd, 'temp', 'site-builds', descriptor.id);
  await assertNoSymlinks(siteRoot);
  await mkdir(siteRoot, { recursive: true });
  const runRoot = path.join(siteRoot, randomUUID());
  await mkdir(runRoot);
  const output = path.join(runRoot, 'build');
  const evidence = path.join(runRoot, 'evidence');
  const buildArgs = ['--manifest', manifestPath, '--output', output, '--evidence', evidence];
  if (options.engine) buildArgs.push('--engine', path.resolve(cwd, options.engine));
  await runChild(path.join(ownRoot, 'scripts', 'build-site.mjs'), buildArgs, cwd, env);
  const pointer = path.join(siteRoot, 'last-build.json');
  await runChild(path.join(ownRoot, 'scripts', 'verify-site-build.mjs'), [
    '--manifest', manifestPath, '--workspace', cwd, '--build', output, '--evidence', evidence, '--write-pointer', pointer,
  ], cwd, env);
  const result = { site: descriptor.id, buildDirectory: output, evidenceDirectory: evidence, pointerPath: pointer };
  console.log(JSON.stringify(result));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseOptions(process.argv.slice(2), { '--manifest': 'manifest', '--engine': 'engine', '--initial-header': 'initialHeader' }, usage);
    if (options.help) console.log(usage);
    else await runSite(options);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
