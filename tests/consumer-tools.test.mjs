import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { exportEnginePackage } from '../scripts/lib/site-packages.mjs';
import { loadPublicEnvironment } from '../scripts/run-site.mjs';

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const cli = name => path.join(ownRoot, 'scripts', `${name}.mjs`);
const require = createRequire(import.meta.url);
const tempRoot = path.join(ownRoot, 'temp', 'consumer-tools-tests');
await mkdir(tempRoot, { recursive: true });

async function put(root, filename, content) {
  await mkdir(path.dirname(path.join(root, filename)), { recursive: true });
  await writeFile(path.join(root, filename), typeof content === 'string' ? content : JSON.stringify(content));
}

async function fixture({ withTest = false } = {}) {
  const root = await mkdtemp(path.join(tempRoot, 'case-'));
  const source = path.join(root, 'engine-source');
  const app = path.join(root, 'consumer');
  const site = 'sample';
  const manifest = {
    schemaVersion: 1, name: '@vargajoe/sn-magazine-engine', version: '0.1.0-test',
    core: [
      { source: 'src/index.js', target: 'src/index.js' },
      { source: 'src/component-loaders.js', target: 'src/component-loaders.js' },
      { source: 'src/widget.js', target: 'src/widget.js', component: 'widgets/engine-widget' },
      { source: 'src/components/utils/component-registry.js', target: 'src/components/utils/component-registry.js' },
    ],
    features: { optional: [{ source: 'src/optional.js', target: 'src/optional.js', component: 'widgets/optional-widget' }] },
    publicFiles: [{ source: 'public/index.html', target: 'public/index.html' }],
    tooling: [{ source: 'scripts/prepare-netlify.mjs', target: 'scripts/prepare-netlify.mjs' }],
  };
  await put(source, 'package.json', {
    dependencies: { 'react-scripts': require('react-scripts/package.json').version },
    browserslist: ['defaults'],
  });
  await put(source, 'LICENSE', 'Fixture license\n');
  await put(source, 'engine/manifest.json', manifest);
  await put(source, 'src/index.js', [
    "import { registerComponentLoaders, getComponent } from './components/utils/component-registry';",
    "import componentLoaders from './component-loaders';",
    'registerComponentLoaders(componentLoaders);',
    "document.getElementById('root').textContent = getComponent('widgets/site-card') + process.env.REACT_APP_PUBLIC;",
  ].join('\n'));
  await put(source, 'src/widget.js', "const widget = 'engine widget'; export default widget;");
  await put(source, 'src/component-loaders.js', 'export default {};');
  await put(source, 'src/optional.js', "export default 'unselected optional widget';");
  await put(source, 'src/components/utils/component-registry.js', [
    'let loaders = {};',
    'export function registerComponentLoaders(next) { loaders = next; }',
    'export function getComponent(key) { return loaders[key](); }',
  ].join('\n'));
  await put(source, 'public/index.html', '<!doctype html><html><head><title>Fixture</title></head><body><div id="root"></div></body></html>');
  await put(source, 'scripts/prepare-netlify.mjs', '// No extra public assets in this fixture.\n');
  const engine = await exportEnginePackage({ repoRoot: source, outputRoot: path.join(root, 'engine') });
  const descriptor = { schemaVersion: 1, id: site, engineFeatures: [], files: [
    { source: 'card.js', target: `src/sites/${site}/card.js`, component: 'widgets/site-card' },
  ] };
  const manifestPath = path.join(app, 'src', 'sites', site, 'site.json');
  await put(app, 'package.json', { private: true });
  await put(app, '.env.example', 'REACT_APP_PUBLIC="public example"\nCI=true\nGENERATE_SOURCEMAP=false\n');
  await put(app, '.env', 'REACT_APP_PUBLIC="public local"\n');
  await put(app, `src/sites/${site}/site.json`, descriptor);
  await put(app, `src/sites/${site}/card.js`, "const card = 'site card'; export default card;");
  // An invalid foreign suite must never be read or copied by the selected consumer.
  await put(app, 'src/sites/foreign/do-not-read.test.jsx', 'invalid javascript OTHER APP PRIVATE TEST');
  if (withTest) await put(app, `src/sites/${site}/lazy.test.jsx`, [
    "jest.mock('./card', () => ({ __esModule: true, default: 'mocked site card' }));",
    "import { getComponent } from '../../components/utils/component-registry';",
    "test('app mock resolves when selected component is requested', () => {",
    "  expect(getComponent('widgets/site-card')).toBe('mocked site card');",
    "  expect(getComponent('widgets/engine-widget')).toBe('engine widget');",
    '});',
  ].join('\n'));
  return { root, app, engine: engine.root, site, manifestPath };
}

async function invoke(name, setup, extra = [], env = {}) {
  return exec(process.execPath, [cli(name), '--manifest', setup.manifestPath, '--engine', setup.engine, ...extra], {
    cwd: setup.app, env: { ...process.env, ...env }, maxBuffer: 4 * 1024 * 1024,
  });
}

function result(output) {
  return JSON.parse(output.trim().split(/\r?\n/).at(-1));
}

test('public env uses caller, local, example precedence without mutating inputs or exposing private values', async () => {
  const setup = await fixture();
  await put(setup.app, '.env.example', 'REACT_APP_PUBLIC=example\nREACT_APP_DEFAULT="with # inside" # comment\nCI=true\n');
  const inherited = { REACT_APP_PUBLIC: 'shell', PATH: 'preserved', READER_INITIAL_HEADER_CONFIG: 'not-explicit' };
  const before = await readFile(path.join(setup.app, '.env'), 'utf8');
  const loaded = await loadPublicEnvironment(setup.app, inherited);
  assert.equal(loaded.REACT_APP_PUBLIC, 'shell');
  assert.equal(loaded.REACT_APP_DEFAULT, 'with # inside');
  assert.equal(loaded.PATH, 'preserved');
  assert.equal(loaded.READER_INITIAL_HEADER_CONFIG, undefined);
  assert.equal(inherited.READER_INITIAL_HEADER_CONFIG, 'not-explicit');
  assert.equal((await loadPublicEnvironment(setup.app, {})).REACT_APP_PUBLIC, 'public local');
  assert.equal((await loadPublicEnvironment(setup.app, {}, 'header.json')).READER_INITIAL_HEADER_CONFIG, path.join(setup.app, 'header.json'));
  assert.equal(await readFile(path.join(setup.app, '.env'), 'utf8'), before);
  await put(setup.app, '.env', 'PRIVATE_TOKEN=do-not-print-this-value\n');
  await assert.rejects(loadPublicEnvironment(setup.app, {}), error => /Only public frontend/.test(error.message) && !error.message.includes('do-not-print'));
});

test('CLI usage is available and rejects missing, unknown and repeated options', async () => {
  for (const name of ['run-site', 'test-site']) {
    assert.match((await exec(process.execPath, [cli(name), '--help'])).stdout, /--manifest PATH/);
    for (const args of [[], ['--unknown', 'value'], ['--manifest', 'one', '--manifest', 'two']]) {
      await assert.rejects(exec(process.execPath, [cli(name), ...args]), error => /Usage:/.test(error.stderr));
    }
  }
});

test('rejected private environment input leaves the last build pointer intact without logging its value', async () => {
  const setup = await fixture();
  const pointer = 'temp/site-builds/sample/last-build.json';
  const saved = '{"previous":"verified build"}\n';
  await put(setup.app, pointer, saved);
  await put(setup.app, '.env', 'PRIVATE_TOKEN=private-value-must-stay-unprinted\n');
  await assert.rejects(invoke('run-site', setup), error => {
    assert.match(error.stderr, /Only public frontend/);
    assert.doesNotMatch(`${error.stdout}${error.stderr}`, /private-value-must-stay-unprinted/);
    return true;
  });
  assert.equal(await readFile(path.join(setup.app, pointer), 'utf8'), saved);
  assert.deepEqual(await readdir(path.dirname(path.join(setup.app, pointer))), ['last-build.json']);
});

test('test assembly selects only own tests, only selected components, and keeps production descriptor clean', async () => {
  const setup = await fixture({ withTest: true });
  const descriptorBefore = await readFile(setup.manifestPath, 'utf8');
  const assembled = result((await invoke('test-site', setup, ['--assemble-only'])).stdout);
  assert.deepEqual(assembled.testFiles, ['src/sites/sample/lazy.test.jsx']);
  assert.equal(assembled.status, 'assembled');
  const registry = await readFile(path.join(assembled.assemblyRoot, 'src/component-loaders.js'), 'utf8');
  assert.match(registry, /\(\) => require\("\.\/sites\/sample\/card.js"\)\.default/);
  assert.doesNotMatch(registry, /optional-widget|foreign|^import /m);
  assert.deepEqual(await readdir(path.join(assembled.assemblyRoot, 'src/sites')), ['sample']);
  assert.equal(await readFile(setup.manifestPath, 'utf8'), descriptorBefore);
  const proof = JSON.parse(await readFile(assembled.proofPath, 'utf8'));
  assert.equal(proof.engineFingerprint, assembled.engineFingerprint);
  assert.ok(proof.productionInputCount > 0);
});

test('real caller Jest runs own suite and lazy component factories honor its mock', async () => {
  const setup = await fixture({ withTest: true });
  const completed = await invoke('test-site', setup);
  const tested = result(completed.stdout);
  assert.equal(tested.status, 'passed');
  assert.match(completed.stderr, /1 passed/);
  assert.equal(JSON.parse(await readFile(tested.proofPath, 'utf8')).status, 'passed');
});

test('consumer with no app suite succeeds with an isolated assembly proof', async () => {
  const setup = await fixture();
  const completed = await invoke('test-site', setup);
  assert.match(completed.stdout, /No app-specific tests/);
  const tested = result(completed.stdout);
  assert.equal(tested.status, 'no-app-specific-tests');
  assert.deepEqual(tested.testFiles, []);
  assert.equal(JSON.parse(await readFile(tested.proofPath, 'utf8')).site, setup.site);
});

test('app test symlinks cannot cross the selected namespace boundary', async t => {
  const setup = await fixture();
  try {
    await symlink(path.join(setup.app, 'src/sites/foreign'), path.join(setup.app, 'src/sites/sample/linked'), 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('Host does not permit test junction creation');
    throw error;
  }
  await assert.rejects(invoke('test-site', setup, ['--assemble-only']), error => /cannot contain symlinks/.test(error.stderr));
});

test('real consumer build writes a verified generic pointer and chooses a fresh output on each invocation', async () => {
  const setup = await fixture();
  const envBefore = await readFile(path.join(setup.app, '.env'), 'utf8');
  const first = result((await invoke('run-site', setup, [], { REACT_APP_PUBLIC: 'public caller override' })).stdout);
  const pointer = JSON.parse(await readFile(first.pointerPath, 'utf8'));
  assert.equal(pointer.schemaVersion, 1);
  assert.equal(pointer.site, setup.site);
  assert.equal(pointer.buildDirectory, first.buildDirectory);
  assert.equal(pointer.evidenceDirectory, first.evidenceDirectory);
  assert.match(pointer.buildProofSha256, /^[a-f0-9]{64}$/);
  const proof = JSON.parse(await readFile(path.join(first.evidenceDirectory, 'build-proof.json'), 'utf8'));
  assert.deepEqual(proof.violations, []);
  const js = proof.output.filter(file => file.path.endsWith('.js'));
  assert.ok((await Promise.all(js.map(file => readFile(path.join(first.buildDirectory, file.path), 'utf8')))).some(content => content.includes('public caller override')));
  const second = result((await invoke('run-site', setup)).stdout);
  assert.notEqual(second.buildDirectory, first.buildDirectory);
  assert.equal(JSON.parse(await readFile(first.pointerPath, 'utf8')).buildDirectory, second.buildDirectory);
  assert.equal(await readFile(path.join(setup.app, '.env'), 'utf8'), envBefore);
  assert.ok((await readdir(first.buildDirectory)).includes('asset-manifest.json'));
});
