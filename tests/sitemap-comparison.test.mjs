import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { compareSitemaps, comparisonCsv, sitemapEntries } from '../scripts/lib/sitemap-comparison.mjs';

const origin = 'https://magazine.example';
const baseline = rows => '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  rows.map(([path, lastmod]) => `<url><loc>${origin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n') +
  '\n</urlset>\n';

test('comparison accounts for retained/removed/added URLs and metadata-only changes', () => {
  const old = baseline([['/'], ['/article'], ['/future', '2025-01-01T00:00:00.000Z'], ['/withdrawn']]);
  const proposed = {
    asOf: '2026-10-23T00:00:00.000Z',
    entries: [
      { url: `${origin}/`, reason: 'home', lastmod: '' },
      { url: `${origin}/article`, reason: 'published-content', lastmod: '2026-01-01T12:00:00.000Z' },
      { url: `${origin}/new`, reason: 'navigation', lastmod: '' },
    ],
    excluded: [{ url: `${origin}/future`, path: '/Root/Content/Magazine/future', type: 'Article', reason: 'future-publish-date' }],
    warnings: [{ code: 'published-content-without-navigation-ancestor', url: `${origin}/article` }],
  };
  const result = compareSitemaps(old, proposed, origin);
  assert.deepEqual(result.summary, { previous: 4, proposed: 3, retained: 2, removed: 2, added: 1, lastmodChanged: 1, warnings: 1 });
  assert.deepEqual(result.removed.map(x => x.reason), ['future-publish-date', 'not-in-public-inventory']);
  assert.equal(result.removed[0].lastmod, '');
  assert.equal(result.removed[0].previousLastmod, '2025-01-01T00:00:00.000Z');
  assert.equal(result.retained[0].lastmodChanged, false);
  assert.equal(result.retained[1].lastmodChanged, true);
  assert.equal(result.added[0].url, `${origin}/new`);
  assert.deepEqual(result.warnings, proposed.warnings);
});

test('plain sitemap baseline reader decodes entities and rejects unsupported/ambiguous or cross-site input', () => {
  const rows = sitemapEntries(baseline([['/a&amp;b'], ['/unicode/%C3%A1'], ['/n&#117;meric']]), origin);
  assert.deepEqual([...rows.keys()], [`${origin}/a&b`, `${origin}/unicode/%C3%A1`, `${origin}/numeric`]);
  const invalid = [
    '<html><loc>https://magazine.example/</loc></html>',
    '<sitemapindex></sitemapindex>', '<urlset></urlset>', baseline([['/'], ['/']]),
    baseline([['/bad&entity;']]), baseline([['/bad&#0;']]), baseline([['/bad&#x110000;']]),
    baseline([['/']]).replace(origin, 'https://another.example'),
    baseline([['/?draft=true']]), baseline([['/#fragment']]),
    baseline([['/']]).replace('<loc>', '<loc>broken<'),
    baseline([['/']]).replace('</loc>', '</loc><loc>https://magazine.example/second</loc>'),
    baseline([['/']]).replace('</urlset>', ''),
    '<!DOCTYPE urlset [<!ENTITY x "file:///private">]>' + baseline([['/']]),
  ];
  for (const xml of invalid) assert.throws(() => sitemapEntries(xml, origin));
});

test('CSV preserves URL, reason and quoted Unicode paths without mixing old/new lastmod', () => {
  const comparison = { retained: [{ url: `${origin}/%C3%A1`, path: '/Root/Content/Árvíz/a,"b"', type: 'Article',
    reason: 'published-content', lastmod: '2026-01-01T00:00:00.000Z', previousLastmod: '' }], removed: [], added: [] };
  const csv = comparisonCsv(comparison);
  assert.ok(csv.startsWith('\uFEFF"change","url"'));
  assert.ok(csv.includes('"/Root/Content/Árvíz/a,""b"""'));
  assert.ok(csv.includes('"published-content","2026-01-01T00:00:00.000Z",""\r\n'));
});

test('CSV neutralizes formula-leading source text including quoted cells and leading whitespace', () => {
  for (const value of ['=1+1', '+SUM(1,1)', '-1+1', '@SUM(1,1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1']) {
    const csv = comparisonCsv({ retained: [], added: [], removed: [{ url: `${origin}/gone`, type: value,
      previousLastmod: value, reason: 'not-in-public-inventory' }] });
    assert.ok(csv.includes(`"'${value}"`), JSON.stringify(value));
  }
});

test('real comparison CLI writes a local preview and CSV using anonymous GETs only', { timeout: 30000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sitemap-comparison-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  });
  const baselinePath = join(directory, 'baseline.xml');
  const output = join(directory, 'output');
  await writeFile(baselinePath, baseline([['/']]));
  const requests = [];
  const rows = [
    { Id: 1, Path: '/Root/Content/Magazine', Type: 'Workspace', IsFolder: true, Hidden: false },
    { Id: 2, Path: '/Root/Content/Magazine/article', Type: 'Article', IsFolder: true, Hidden: false,
      PublishDate: '2020-01-01T00:00:00Z', ModificationDate: '2025-01-01T00:00:00Z' },
    { Id: 3, Path: '/Root/Content/Magazine/future', Type: 'Article', Hidden: false, PublishDate: '2099-01-01T00:00:00Z' },
  ];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, headers: request.headers });
    const url = new URL(request.url, 'http://localhost');
    const query = url.searchParams.get('query');
    const skip = Number(/\.SKIP:(\d+)/.exec(query)?.[1]);
    const hiddenOnly = query.includes('+Hidden:1');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ d: { results: skip || hiddenOnly ? [] : rows, __count: hiddenOnly ? '0' : '3' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['scripts/compare-sitemap.mjs', '--baseline', baselinePath, '--output', output], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, REACT_APP_API_URL: `http://127.0.0.1:${server.address().port}`,
        REACT_APP_DATA_PATH: '/Root/Content/Magazine', REACT_APP_SITE_HOST: origin,
        REACT_APP_SITEMAP_PATH: '/(structure)/Site/sitemap.xml', REACT_APP_WIDGET_TYPE: 'Widget',
        SENSENET_API_KEY: 'private-fixture-only', SENSENET_ACCESS_TOKEN: '' },
    });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', bytes => { stdout += bytes; });
    child.stderr.on('data', bytes => { stderr += bytes; });
    child.on('error', reject);
    child.on('close', code => resolveResult({ code, stdout, stderr }));
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { preview: true, previous: 1, proposed: 2, retained: 1, removed: 0, added: 1, lastmodChanged: 0, warnings: 1 });
  const xml = await readFile(join(output, 'proposed.xml'), 'utf8');
  assert.equal(sitemapEntries(xml, origin).size, 2);
  assert.doesNotMatch(xml, /future|private-fixture/);
  assert.equal(JSON.parse(await readFile(join(output, 'comparison.json'), 'utf8')).added.length, 1);
  assert.match(await readFile(join(output, 'changes.csv'), 'utf8'), /published-content/);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.method, 'GET');
    for (const header of ['authorization', 'apikey', 'cookie']) assert.equal(request.headers[header], undefined);
    assert.doesNotMatch(request.url, /Upload|HasPermission/);
  }
});
