import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { discoverProfileLinks } from '../scripts/lib/sitemap-profile-links.mjs';
import { generateSitemapReport } from '../scripts/lib/sitemap.mjs';

const ROOT = '/Root/Content/Magazine';
const BASE = '/Root/Content/(layout)';
const CATEGORY = `${ROOT}/Creators`;
const ENV = { REACT_APP_API_URL: 'https://repository.example', REACT_APP_DATA_PATH: ROOT,
  REACT_APP_SITE_HOST: 'https://magazine.example', REACT_APP_PAGECONTAINER_PATH: BASE };
const CONTEXT = { Id: 2, Path: CATEGORY, Type: 'LeisureCategory', Hidden: false, DisplayZone: ['menuitem'], IsFolder: true };
const LAYOUT = { Id: 100, Path: `${BASE}/LeisureCategory`, Name: 'LeisureCategory', Type: 'Layout', Hidden: false, PageTemplate: 'wide' };
const WIDGET = { Id: 101, Path: `${LAYOUT.Path}/List`, Type: 'WidgetContentCollection', Hidden: false,
  ClientComponent: 'list-review', PortletZone: 'content', ContextBinding: ['currentcontext'], ChildrenLevel: [],
  ContentQuery: '+TypeIs:LeisureArticle +Hidden:0 +PublishDate:<@@CurrentTime@@ .REVERSESORT:PublishDate' };
const profile = (Id = 3, relative = '/Creator', overrides = {}) => ({ Id, Path: `${CATEGORY}${relative}`,
  Type: 'LeisureMangakaBio', Hidden: false, DisplayZone: [], IsFolder: true,
  PublishDate: '0001-01-01T00:00:00Z', ModificationDate: '2026-10-18T12:00:00Z', ...overrides });

function discovery(options = {}) {
  const calls = [];
  const query = async (expression, select, expand) => {
    calls.push({ expression, select, expand });
    if (select.includes('PageTemplate')) return options.layouts ?? [LAYOUT];
    if (select.includes('ClientComponent')) return options.widgets ?? [WIDGET];
    return options.results ?? [profile()];
  };
  const run = () => discoverProfileLinks({ env: ENV, configuration: { root: ROOT, widgetType: 'Widget' },
    contexts: [CONTEXT], candidates: [profile()], hiddenPaths: new Set(), ...options.input }, query);
  return { calls, run };
}

test('proves a profile through its rendered category list, retaining the effective filter and provenance', async () => {
  const api = discovery();
  assert.deepEqual(await api.run(), new Map([[profile().Path, new Set([CATEGORY])]]));
  assert.equal(api.calls[1].expand, 'CustomRoot');
  const expression = api.calls[2].expression;
  assert.ok(expression.includes(`+InTree:"${ROOT}" +Id:(3)`));
  assert.ok(expression.includes(`+InFolder:"${CATEGORY}"`));
  assert.match(expression, /\+TypeIs:LeisureArticle \+Hidden:0 \+PublishDate:<@@CurrentTime@@/);
  assert.doesNotMatch(expression, /\.REVERSESORT|\.SORT/);
});

test('a public profile below a menu category still needs a list query match', async () => {
  const api = discovery({ results: [] });
  assert.equal((await api.run()).size, 0);
  assert.equal(api.calls.length, 3);
});

test('uses the deepest exact-type layout and respects an explicit This override', async () => {
  const deeper = { ...LAYOUT, Id: 102, Path: `${CATEGORY}/(layout)/Nested/LeisureCategory`, PageTemplate: 'error' };
  const derived = { ...deeper, Id: 103, Type: 'DerivedLayout', Path: `${CATEGORY}/(layout)/More/Nested/LeisureCategory` };
  assert.equal((await discovery({ layouts: [LAYOUT, deeper] }).run()).size, 0);
  assert.equal((await discovery({ layouts: [LAYOUT, derived] }).run()).size, 1);
  const override = { ...LAYOUT, Id: 104, Name: 'This', Path: `${CATEGORY}/(layout)/This`, Hidden: true };
  assert.equal((await discovery({ layouts: [LAYOUT, override] }).run()).size, 0, 'hidden override cannot expose the fallback list');
});

test('a direct menu Layout can supply its own rendered list', async () => {
  const context = { ...CONTEXT, Type: 'Layout' };
  const layout = { ...LAYOUT, Path: CATEGORY };
  const widget = { ...WIDGET, Path: `${CATEGORY}/List` };
  const api = discovery({ input: { contexts: [context] }, layouts: [layout], widgets: [widget] });
  assert.equal((await api.run()).size, 1);
  assert.ok(api.calls[0].expression.includes(`Path:("${CATEGORY}")`));
});

test('does not guess which of two equally deep layouts the page will render', async () => {
  const first = { ...LAYOUT, Path: `${CATEGORY}/(layout)/This`, Name: 'This' };
  const second = { ...LAYOUT, Id: 105, Path: `${BASE}/Nested/More/LeisureCategory` };
  assert.equal(first.Path.split('/').length, second.Path.split('/').length);
  assert.equal((await discovery({ layouts: [first, second] }).run()).size, 0);
});

test('declines hidden, unsupported or unrendered widgets and layouts', async t => {
  for (const [label, options] of [
    ['hidden widget', { widgets: [{ ...WIDGET, Hidden: '1' }] }],
    ['hidden layout branch', { input: { hiddenPaths: new Set([BASE]) } }],
    ['hidden widget branch', { input: { hiddenPaths: new Set([WIDGET.Path]) } }],
    ['unsupported view', { widgets: [{ ...WIDGET, ClientComponent: 'list-manga-half' }] }],
    ['view requiring other schema fields', { widgets: [{ ...WIDGET, ClientComponent: 'list-manga' }] }],
    ['unrendered zone', { widgets: [{ ...WIDGET, PortletZone: 'side' }] }],
    ['unsupported template', { layouts: [{ ...LAYOUT, PageTemplate: 'unknown' }] }],
    ['hidden layout', { layouts: [{ ...LAYOUT, Hidden: true }] }],
    ['nested widget', { widgets: [{ ...WIDGET, Path: `${LAYOUT.Path}/Nested/List` }] }],
  ]) await t.test(label, async () => assert.equal((await discovery(options).run()).size, 0));
});

test('declines collection bindings whose real result set cannot be established', async t => {
  for (const [label, change] of [
    ['SmartFolder', { CustomRoot: { Path: CATEGORY, Type: 'SmartFolder' }, ContextBinding: ['customroot'] }],
    ['incomplete expanded root', { CustomRoot: { Path: CATEGORY }, ContextBinding: ['customroot'] }],
    ['other-site root', { CustomRoot: { Path: `${ROOT}Sibling/Creators`, Type: 'LeisureCategory' }, ContextBinding: ['customroot'] }],
    ['Workspace may differ from data root', { ContextBinding: ['currentsite'] }],
    ['unresolved reference', { ContextBinding: ['CurrentReference'] }],
    ['relative SmartFolder may override query', { RelativePath: '/Other' }],
    ['deep collection scope', { ChildrenLevel: ['deep'] }],
    ['limited first page', { ContentQuery: '+TypeIs:LeisureArticle .TOP:1' }],
    ['skipped first page', { ContentQuery: '+TypeIs:LeisureArticle .SKIP:1' }],
    ['unknown directive', { ContentQuery: '+TypeIs:LeisureArticle .AUTOFILTERS:OFF' }],
    ['unterminated term', { ContentQuery: 'Title:"unfinished' }],
  ]) await t.test(label, async () => {
    const api = discovery({ widgets: [{ ...WIDGET, ...change }] });
    assert.equal((await api.run()).size, 0);
    assert.equal(api.calls.length, 2, 'do not ask a narrowed query to invent link evidence');
  });
});

test('supports an explicitly expanded ordinary custom root within this site', async () => {
  const widget = { ...WIDGET, ContextBinding: ['customroot'], CustomRoot: { Path: CATEGORY, Type: 'LeisureCategory' } };
  assert.equal((await discovery({ widgets: [widget] }).run()).size, 1);
});

test('preserves quoted query directives in ordinary lists', async () => {
  const api = discovery({ widgets: [{ ...WIDGET, ClientComponent: 'list-news', ContentQuery: 'Title:".TOP:1" .SORT:DisplayName' }] });
  assert.equal((await api.run()).size, 1);
  assert.ok(api.calls[2].expression.includes('Title:".TOP:1"'));
  assert.doesNotMatch(api.calls[2].expression, /\.SORT/);
});

test('batches large profile result checks and rejects unrelated or malformed returned identities', async t => {
  const candidates = Array.from({ length: 101 }, (_, i) => profile(i + 1, `/Creator-${i}`));
  const api = discovery({ input: { candidates }, results: [] });
  assert.equal((await api.run()).size, 0);
  assert.equal(api.calls.length, 4);
  for (const result of [profile(99), profile(3, '/Wrong'), profile(3, '/Creator', { Type: 'Other' })]) {
    await t.test(result.Path + result.Type, () => assert.rejects(discovery({ results: [result] }).run(), /Invalid profile link query result/));
  }
});

test('does not require new settings or discovery requests when there are no undated profiles', async () => {
  const api = discovery({ input: { env: {}, candidates: [] } });
  assert.equal((await api.run()).size, 0);
  assert.equal(api.calls.length, 0);
  await assert.rejects(discovery({ input: { env: {} } }).run(), /layout configuration/);
});

test('real HTTP generation includes only linked undated profiles and retains all visibility gates', async t => {
  const rows = [
    { Id: 1, Path: ROOT, Type: 'Workspace', Hidden: false, IsFolder: true }, CONTEXT,
    profile(), profile(4, '/NotLinked'), profile(5, '/NullDate', { PublishDate: null }),
    profile(6, '/Hidden', { Hidden: true }), profile(7, '/Future', { PublishDate: '2099-01-01T00:00:00Z' }),
    profile(8, '/Ordinary', { Type: 'LeisureArticle' }),
    profile(9, '/HiddenBranch/Child'), profile(10, '/BadDate', { PublishDate: 'invalid' }),
  ];
  const hidden = [{ Id: 11, Path: `${CATEGORY}/HiddenBranch`, Type: 'SystemFolder', Hidden: true }];
  const calls = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const query = url.searchParams.get('query');
    const select = url.searchParams.get('$select');
    calls.push({ url, method: request.method, headers: request.headers });
    const skip = Number(/\.SKIP:(\d+)/.exec(query)[1]);
    let results = rows;
    if (query.includes('+Hidden:1')) results = hidden;
    else if (select.includes('PageTemplate')) results = [LAYOUT];
    else if (select.includes('ClientComponent')) results = [WIDGET];
    else if (query.includes('+Id:')) {
      assert.ok(query.includes('+Id:(3 4 5)'));
      results = [profile(), profile(5, '/NullDate', { PublishDate: null })].map(({ Id, Path, Type }) => ({ Id, Path, Type }));
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ d: { results: results.slice(skip, skip + 1), __count: String(results.length) } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const signals = [];
  const report = await generateSitemapReport({ ...ENV, SENSENET_API_KEY: 'private-fixture-key',
    REACT_APP_API_URL: `http://127.0.0.1:${server.address().port}` }, (url, options) => {
    signals.push(options.signal);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    return fetch(url, options);
  }, { now: '2026-10-23T12:00:00Z' });
  assert.deepEqual(report.entries.map(entry => entry.path), [ROOT, CATEGORY, profile().Path, profile(5, '/NullDate').Path]);
  for (const entry of report.entries.filter(entry => entry.reason === 'linked-author-profile')) {
    assert.equal(entry.lastmod, '2026-10-18T12:00:00.000Z');
    assert.deepEqual(entry.linkedFrom, [CATEGORY]);
  }
  assert.ok(report.excluded.some(entry => entry.path.endsWith('/HiddenBranch/Child') && entry.reason === 'hidden-ancestor'));
  assert.ok(report.excluded.some(entry => entry.path.endsWith('/Future') && entry.reason === 'future-publish-date'));
  assert.ok(report.excluded.some(entry => entry.path.endsWith('/BadDate') && entry.reason === 'invalid-publish-date'));
  assert.ok(report.excluded.some(entry => entry.path.endsWith('/Ordinary') && entry.reason === 'not-navigation-or-published-content'));
  assert.ok(calls.length > 10, 'fixture exercises every discovery stream over several pages');
  assert.equal(new Set(signals).size, 1);
  for (const call of calls) {
    assert.equal(call.method, 'GET');
    assert.equal(call.headers.authorization, undefined);
    assert.equal(call.headers.apikey, undefined);
    assert.equal(call.headers.cookie, undefined);
    if (call.url.searchParams.get('$select').includes('PageTemplate') || call.url.searchParams.get('query').includes('+Id:')) {
      assert.equal(call.url.searchParams.get('enableautofilters'), 'false');
      assert.equal(call.url.searchParams.get('enablelifespanfilter'), 'true');
    }
  }
});
