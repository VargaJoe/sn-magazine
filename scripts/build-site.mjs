import { createRequire } from 'node:module';
import { fork } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleSite, assertNoSymlinks, ensureEmptyOutput, exportEnginePackage, readInitialHeaderInputs, validateBuildOutput, verifyBuildGraph,
} from './lib/site-packages.mjs';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function args(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    if (!['--manifest', '--output', '--engine', '--evidence'].includes(key) || !values[index + 1] || values[index + 1].startsWith('--') || result[key]) throw new Error('Usage: node scripts/build-site.mjs --manifest PATH --output ABS [--engine PATH] [--evidence ABS]');
    result[key] = values[index + 1];
  }
  if (!result['--manifest'] || !result['--output']) throw new Error('--manifest and --output are required');
  return result;
}

async function exists(filename) {
  try { await lstat(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function run(filename, arguments_, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = fork(filename, arguments_, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Build process failed (${signal || code}): ${path.basename(filename)}`)));
  });
}

async function main() {
  const options = args(process.argv.slice(2));
  const cwd = process.cwd();
  const output = await validateBuildOutput(cwd, options['--output']);
  const tempRoot = path.resolve(cwd, 'temp');
  await assertNoSymlinks(tempRoot);
  await mkdir(tempRoot, { recursive: true });
  const workspace = await mkdtemp(path.join(tempRoot, 'site-build-'));
  const evidence = options['--evidence'] ? await validateBuildOutput(cwd, options['--evidence']) : path.join(workspace, 'evidence');
  if (evidence === output || output.startsWith(`${evidence}${path.sep}`) || evidence.startsWith(`${output}${path.sep}`)) throw new Error('Evidence and public output must be separate directories');
  await ensureEmptyOutput(output);
  await ensureEmptyOutput(evidence);
  let engineRoot;
  if (options['--engine']) engineRoot = path.resolve(options['--engine']);
  else if (await exists(path.join(ownRoot, 'engine.json'))) engineRoot = ownRoot;
  else engineRoot = (await exportEnginePackage({ repoRoot: ownRoot, outputRoot: path.join(workspace, 'engine') })).root;
  const assembly = await assembleSite({ engineRoot, manifestPath: path.resolve(cwd, options['--manifest']), outputRoot: path.join(workspace, 'app') });
  if (!assembly.allowInitialHeader && process.env.READER_INITIAL_HEADER_CONFIG?.trim()) throw new Error('This consumer does not allow READER_INITIAL_HEADER_CONFIG');
  const initialHeader = { configPath: process.env.READER_INITIAL_HEADER_CONFIG?.trim() || '', site: assembly.site, excludedRoots: [engineRoot, assembly.root, output, evidence] };
  assembly.consumerBuildInputs = await readInitialHeaderInputs(initialHeader);
  // Resolve the caller's one dependency installation. The assembled src is under
  // that caller's ignored temp, so CRA/Node's normal ancestor resolution applies.
  const consumerRequire = createRequire(path.join(cwd, 'package.json'));
  const buildScript = consumerRequire.resolve('react-scripts/scripts/build.js');
  const env = { ...process.env, READER_INITIAL_HEADER_CONFIG: initialHeader.configPath, BUILD_PATH: output, GENERATE_SOURCEMAP: 'false', NODE_ENV: 'production' };
  await writeFile(path.join(evidence, 'input-provenance.json'), `${JSON.stringify(assembly, null, 2)}\n`);
  await run(buildScript, ['--stats'], assembly.root, env);
  const statsPath = path.join(output, 'bundle-stats.json');
  const savedStats = path.join(evidence, 'bundle-stats.json');
  await rename(statsPath, savedStats);
  const prepareScript = path.join(assembly.root, 'scripts', 'prepare-netlify.mjs');
  await run(prepareScript, [], assembly.root, env);
  if (JSON.stringify(await readInitialHeaderInputs(initialHeader)) !== JSON.stringify(assembly.consumerBuildInputs)) throw new Error('Initial header inputs changed during the build');
  const stats = JSON.parse(await readFile(savedStats, 'utf8'));
  let proof;
  try {
    proof = await verifyBuildGraph({ stats, assembly, outputRoot: output });
  } catch (error) {
    if (error.proof) await writeFile(path.join(evidence, 'build-proof.json'), `${JSON.stringify(error.proof, null, 2)}\n`);
    throw error;
  }
  Object.assign(proof, { engineRoot, inputRoot: assembly.root, evidenceRoot: evidence, outputRoot: output });
  proof.consumerBuildInputs = assembly.consumerBuildInputs;
  for (const input of proof.consumerBuildInputs.filter(input => input.outputPath)) {
    if (!proof.output.some(output => output.path === input.outputPath && output.sha256 === input.sha256)) throw new Error('Prepared initial header output differs from its approved input');
  }
  proof.consumerBuildOutput = assembly.allowInitialHeader && !!env.READER_INITIAL_HEADER_CONFIG?.trim() ? ['reader-initial/desktop.png', 'reader-initial/desktop2x.png', 'reader-initial/mobile.png', 'reader-initial/mobile2x.png', 'reader-initial/theme.css'] : [];
  await writeFile(path.join(evidence, 'build-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Verified ${assembly.site}: ${proof.moduleCount} modules, ${proof.chunkCount} chunks, ${proof.inputs.length} selected inputs.`);
  console.log(JSON.stringify({ site: assembly.site, siteId: assembly.site, engineRoot, inputRoot: assembly.root, evidenceRoot: evidence, outputRoot: output, proofPath: path.join(evidence, 'build-proof.json') }));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
