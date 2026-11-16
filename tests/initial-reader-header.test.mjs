import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareInitialReaderHeader } from '../scripts/lib/initial-reader-header.mjs';

test('optional static header keeps artwork in raw HTML and copies original bytes without a replacement script', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reader-header-'));
  try {
    const html = '<html><head></head><body class="site"><div id="root"></div></body></html>';
    await writeFile(join(dir, 'index.html'), html);
    await prepareInitialReaderHeader(dir);
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), html);
    const config = { root: '/Root/Content/Journal', name: 'Journal & Books', theme: join(dir, 'theme.css') };
    await writeFile(config.theme, '.reader-magazine{}');
    // The generator only needs the PNG signature and IHDR dimensions; production uses original files.
    for (const name of ['desktop', 'desktop2x', 'mobile', 'mobile2x']) {
      const bytes = Buffer.alloc(24);
      Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes);
      const scale = name.endsWith('2x') ? 2 : 1;
      bytes.writeUInt32BE((name.startsWith('desktop') ? 205 : 163) * scale, 16);
      bytes.writeUInt32BE((name.startsWith('desktop') ? 44 : 32) * scale, 20);
      config[name] = join(dir, `${name}.png`);
      await writeFile(config[name], bytes);
    }
    const file = join(dir, 'config.json');
    await writeFile(file, JSON.stringify(config));
    await prepareInitialReaderHeader(dir, file);
    const result = await readFile(join(dir, 'index.html'), 'utf8');
    assert.ok(result.indexOf('<picture') < result.indexOf('id="root"'));
    assert.match(result, /width="205" height="44"/);
    assert.match(result, /width="163" height="32"/);
    assert.match(result, /Journal &amp; Books/);
    assert.match(result, /data-page-template="reader-magazine"/);
    assert.match(result, /data-sn-initial-stylesheet data-site-root="\/Root\/Content\/Journal"/);
    assert.match(result, /\[data-sn-initial-header\]\[hidden\]\{display:none!important\}/);
    assert.doesNotMatch(result, /<script|<svg|preload/);
    for (const name of ['desktop', 'desktop2x', 'mobile', 'mobile2x']) {
      assert.deepEqual(await readFile(join(dir, 'reader-initial', `${name}.png`)), await readFile(config[name]));
    }
    await assert.rejects(prepareInitialReaderHeader(dir, file), /rebuild first/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
