import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { generateSitemap, generateSitemapReport } from '../scripts/lib/sitemap.mjs';
import { buildRouting } from '../scripts/lib/build-routing.mjs';
import { readSiteSettings } from '../scripts/lib/site-settings.mjs';

const ROOT = '/Root/Content/Magazine';
const ENV = {
  REACT_APP_API_URL: 'https://repository.example',
  REACT_APP_DATA_PATH: ROOT,
  REACT_APP_SITE_HOST: 'https://magazine.example',
};

function entry(relativePath, overrides = {}) {
  return {
    Id: relativePath || 'root',
    Path: `${ROOT}${relativePath}`,
    Type: 'Article',
    Hidden: false,
    IsFolder: false,
    DisplayZone: ['menuitem'],
    ModificationDate: '2026-10-18T10:20:30Z',
    ...overrides,
  };
}

function page(results, count) {
  return { d: { results, ...(count === undefined ? {} : { __count: String(count) }) } };
}

function repository(pages, hiddenPages) {
  const calls = [];
  let hiddenIndex = 0;
  const fetchImpl = async (url, options) => {
    const isHidden = new URL(url).searchParams.get('query')?.includes('+Hidden:1');
    const index = isHidden && hiddenPages ? hiddenIndex++ : calls.length;
    calls.push({ url: new URL(url), options });
    const next = (isHidden && hiddenPages ? hiddenPages : pages)[index] ?? page([]);
    if (next instanceof Error) throw next;
    if (next instanceof Response) return next;
    return Response.json(next);
  };
  return { calls, fetchImpl };
}

function urls(xml) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);
}

function xmlEntries(xml) {
  return new Map([...xml.matchAll(/<url><loc>([^<]*)<\/loc>(.*?)<\/url>/g)]
    .map(match => [match[1], match[2]]));
}

test('maps only the configured site subtree, includes its root and deduplicates sorted URLs', async () => {
  const api = repository([page([
    entry('/z'),
    entry('', { Type: 'Folder', IsFolder: true }),
    entry('/a'),
    entry('/a', { Id: 'duplicate' }),
    entry('', { Path: '/Root/Content/AnotherMagazine/leaked' }),
    entry('', { Path: `${ROOT}Sibling/leaked` }),
    entry('', { Path: '/Root/Content' }),
  ])]);
  const xml = await generateSitemap({ ...ENV, REACT_APP_DATA_PATH: `${ROOT}/` }, api.fetchImpl);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(urls(xml), [
    'https://magazine.example/',
    'https://magazine.example/a',
    'https://magazine.example/z',
  ]);
  assert.doesNotMatch(xml, /Root\/Content|AnotherMagazine|Sibling/);
});

test('encodes each Unicode, space and reserved path segment without changing its hierarchy', async () => {
  const api = repository([page([
    entry('/árvíztűrő tükörfúrógép/東京'),
    entry('/reserved ?#&<>"\'!()*:;%/end'),
  ])]);
  const xml = await generateSitemap(ENV, api.fetchImpl);
  assert.deepEqual(urls(xml).sort(), [
    'https://magazine.example/%C3%A1rv%C3%ADzt%C5%B1r%C5%91%20t%C3%BCk%C3%B6rf%C3%BAr%C3%B3g%C3%A9p/%E6%9D%B1%E4%BA%AC',
    'https://magazine.example/reserved%20%3F%23%26%3C%3E%22%27%21%28%29%2A%3A%3B%25/end',
  ].sort());
  for (const value of urls(xml)) {
    assert.equal(new URL(value).search, '');
    assert.equal(new URL(value).hash, '');
  }
});

test('XML-escapes URL origin characters accepted by the URL parser', async () => {
  const api = repository([page([entry('/article')])]);
  const xml = await generateSitemap({
    ...ENV, REACT_APP_SITE_HOST: 'https://news&"\'notes.example',
  }, api.fetchImpl);
  assert.deepEqual(urls(xml), ['https://news&amp;&quot;&apos;notes.example/article']);
  assert.doesNotMatch(xml, /<loc>[^<]*&(?!amp;|quot;|apos;|lt;|gt;)/);
});

test('excludes hidden content, technical types and parenthesized repository branches', async () => {
  const excluded = [
    entry('/hidden-boolean', { Hidden: true }),
    entry('/hidden-number', { Hidden: 1 }),
    entry('/hidden-string', { Hidden: 'true' }),
    entry('/hidden-string-number', { Hidden: '1' }),
    entry('/hidden-padded-case', { Hidden: '  TRUE  ' }),
    entry('/hidden-padded-number', { Hidden: ' 1 ' }),
    ...['File', 'Image', 'SystemFolder', 'Widget'].map(Type => entry(`/${Type}`, { Type })),
    entry('/(apps)/page'),
    entry('/news/(structure)/page'),
    entry('/news/(settings)'),
    entry('/double//slash'),
    entry('/./dot'),
    entry('/../parent'),
    entry('/back\\slash'),
    entry('/control\u0001character'),
  ];
  const api = repository([page([entry('/public'), ...excluded])]);
  const xml = await generateSitemap(ENV, api.fetchImpl);
  assert.deepEqual(urls(xml), ['https://magazine.example/public']);
});

test('uses the configured custom widget type in both filtering and the repository query', async () => {
  const api = repository([page([
    entry('/public'), entry('/widget', { Type: 'MagazineWidget' }),
  ])]);
  const xml = await generateSitemap({ ...ENV, REACT_APP_WIDGET_TYPE: 'MagazineWidget' }, api.fetchImpl);
  assert.deepEqual(urls(xml), ['https://magazine.example/public']);
  assert.match(api.calls[0].url.searchParams.get('query'), /-TypeIs:MagazineWidget(?:\s|$)/);
});

test('lastmod uses valid source dates for leaves and published folder details, but omits undated collections or invalid dates', async () => {
  const timestamp = Date.parse('2025-04-05T06:07:08.123Z');
  const api = repository([page([
    entry('/source', { ModificationDate: '2024-03-02T13:14:15+02:00' }),
    entry('/dotnet', { ModificationDate: `/Date(${timestamp}+0200)/` }),
    entry('/folder-detail', { Type: 'LeisureArticle', IsFolder: true, DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z' }),
    entry('/folder-detail-dotnet', { Type: 'LeisureMangaReview', IsFolder: true, DisplayZone: [], PublishDate: `/Date(${timestamp})/`, ModificationDate: `/Date(${timestamp})/` }),
    entry('/folder', { Type: 'Folder', IsFolder: true }),
    entry('/unknown-folder-status', { IsFolder: undefined }),
    entry('/bad-date', { ModificationDate: 'not a date' }),
    entry('/missing-date', { ModificationDate: undefined }),
    entry('/impossible-date', { ModificationDate: '2025-99-99T00:00:00Z' }),
  ])]);
  const entries = xmlEntries(await generateSitemap(ENV, api.fetchImpl));
  assert.equal(entries.get('https://magazine.example/source'), '<lastmod>2024-03-02T11:14:15.000Z</lastmod>');
  assert.equal(entries.get('https://magazine.example/dotnet'), '<lastmod>2025-04-05T06:07:08.123Z</lastmod>');
  assert.equal(entries.get('https://magazine.example/folder-detail'), '<lastmod>2026-10-18T10:20:30.000Z</lastmod>');
  assert.equal(entries.get('https://magazine.example/folder-detail-dotnet'), '<lastmod>2025-04-05T06:07:08.123Z</lastmod>');
  for (const name of ['folder', 'unknown-folder-status', 'bad-date', 'missing-date', 'impossible-date']) {
    assert.equal(entries.get(`https://magazine.example/${name}`), '', name);
  }
});

test('scheduled articles enter at publication with that lastmod, then advance only on a later edit', async () => {
  const PublishDate = '2026-12-01T10:00:00Z';
  const article = entry('/scheduled', { Type: 'LeisureArticle', IsFolder: true, DisplayZone: [],
    PublishDate, ModificationDate: '2026-10-23T07:00:00Z' });
  const run = (now, changes = {}) => generateSitemapReport(ENV, repository([page([
    entry('', { Type: 'Workspace', IsFolder: true, DisplayZone: [] }), { ...article, ...changes },
  ])]).fetchImpl, { now });
  for (const now of ['2026-10-23T12:00:00Z', '2026-12-01T09:59:59.999Z']) {
    const report = await run(now);
    assert.equal(report.entries.some(item => item.path === article.Path), false);
    assert.equal(report.excluded.find(item => item.path === article.Path).reason, 'future-publish-date');
  }
  for (const now of [PublishDate, '2027-02-01T00:00:00Z']) {
    const report = await run(now);
    assert.equal(report.entries.find(item => item.path === article.Path).lastmod, '2026-12-01T10:00:00.000Z');
  }
  const edited = await run('2026-12-03T12:00:00Z', { ModificationDate: '2026-12-02T14:30:00Z' });
  assert.equal(edited.entries.find(item => item.path === article.Path).lastmod, '2026-12-02T14:30:00.000Z');
});

test('lastmod compares actual instants and falls back to whichever valid non-sentinel source date is available', async t => {
  const publication = '2026-01-02T06:00:00.000Z';
  const modified = '2026-01-02T06:30:00.000Z';
  for (const [label, PublishDate, ModificationDate, expected] of [
    ['publication is later', publication, '2025-10-23T07:00:00Z', publication],
    ['modification is later despite offset clock', '2026-01-02T08:00:00+02:00', modified, modified],
    ['.NET publication', `/Date(${Date.parse(publication)})/`, '2025-10-23T07:00:00Z', publication],
    ['.NET modification', publication, `/Date(${Date.parse(modified)})/`, modified],
    ['invalid modification', publication, 'invalid', publication],
    ['missing modification', publication, undefined, publication],
    ['unset modification', publication, '/Date(-62135596800000)/', publication],
    ['unset publication', '0001-01-01T00:00:00Z', modified, modified],
    ['both unset', '0001-01-01T00:00:00Z', undefined, ''],
  ]) await t.test(label, async () => {
    const api = repository([page([entry('/detail', { PublishDate, ModificationDate })])]);
    const report = await generateSitemapReport(ENV, api.fetchImpl, { now: '2026-10-23T12:00:00Z' });
    assert.equal(report.entries[0].lastmod, expected);
  });
});

test('selects homepage, menu pages and published content independently of menu membership or folder status', async () => {
  const now = '2026-10-23T12:00:00.000Z';
  const api = repository([page([
    entry('', { Type: 'Workspace', IsFolder: true, DisplayZone: undefined, PublishDate: null }),
    entry('/menu', { Type: 'LeisureCategory', IsFolder: true, DisplayZone: ['menuitem'], PublishDate: null }),
    entry('/icon', { Type: 'LeisureCategory', IsFolder: true, DisplayZone: 'menuicon', PublishDate: '' }),
    entry('/article', { Type: 'LeisureArticle', IsFolder: true, DisplayZone: [], PublishDate: '2026-10-22T10:00:00Z' }),
    entry('/review', { Type: 'LeisureBookReview', DisplayZone: undefined, PublishDate: `/Date(${Date.parse(now)})/` }),
    entry('/hidden-parent', { Type: 'Folder', IsFolder: true, Hidden: true }),
    entry('/hidden-parent/independent-detail', { IsFolder: true, DisplayZone: [], PublishDate: now }),
    entry('/unmarked-parent', { Type: 'Folder', IsFolder: true, DisplayZone: [], PublishDate: null }),
    entry('/unmarked-parent/independent-detail', { IsFolder: true, DisplayZone: [], PublishDate: now }),
    entry('/test-layout', { Type: 'Layout', IsFolder: true, DisplayZone: [], PublishDate: null }),
    entry('/undated-leaf', { DisplayZone: undefined, PublishDate: null }),
  ])]);
  const report = await generateSitemapReport(ENV, api.fetchImpl, { now });
  assert.equal(report.asOf, now);
  assert.deepEqual(urls(report.xml), [
    'https://magazine.example/',
    'https://magazine.example/article',
    'https://magazine.example/icon',
    'https://magazine.example/menu',
    'https://magazine.example/review',
    'https://magazine.example/unmarked-parent/independent-detail',
  ]);
  assert.deepEqual(report.warnings.map(item => [item.path, item.code]), [
    [`${ROOT}/article`, 'published-content-without-navigation-ancestor'],
    [`${ROOT}/review`, 'published-content-without-navigation-ancestor'],
    [`${ROOT}/unmarked-parent/independent-detail`, 'published-content-without-navigation-ancestor'],
  ]);
  for (const warning of report.warnings) assert.ok(urls(report.xml).includes(warning.url));
  const included = new Map(report.entries.map(item => [item.path, item]));
  assert.equal(included.size, 6);
  for (const item of report.entries) {
    assert.equal(typeof item.reason, 'string');
    assert.ok(item.reason.length > 0);
    assert.equal(typeof item.type, 'string');
    assert.equal(typeof item.lastmod, 'string');
    assert.ok(urls(report.xml).includes(item.url));
  }
  assert.equal(included.get(`${ROOT}/article`).type, 'LeisureArticle');
  assert.equal(included.get(`${ROOT}/article`).lastmod, '2026-10-22T10:00:00.000Z');
  assert.equal(included.get(ROOT).lastmod, '');
  assert.deepEqual(new Map(report.excluded.map(item => [item.path, item.reason])), new Map([
    [`${ROOT}/hidden-parent`, 'hidden'],
    [`${ROOT}/hidden-parent/independent-detail`, 'hidden-ancestor'],
    [`${ROOT}/unmarked-parent`, 'not-navigation-or-published-content'],
    [`${ROOT}/test-layout`, 'not-navigation-or-published-content'],
    [`${ROOT}/undated-leaf`, 'not-navigation-or-published-content'],
  ]));
});

test('excludes entire hidden subtrees using a separately paged inventory without hiding similarly named siblings', async () => {
  const now = '2026-10-23T12:00:00Z';
  const api = repository([page([
    entry('', { IsFolder: true, DisplayZone: [] }),
    ...['private/secret', 'private-sibling/story', 'widget/story', 'system/story'].map(name =>
      entry(`/${name}`, { IsFolder: true, DisplayZone: [], PublishDate: now })),
  ]), page([])], [
    page([
      entry('/private', { Type: 'Folder', IsFolder: true, Hidden: true }),
      entry('/widget', { Type: 'MagazineWidget', IsFolder: true, Hidden: '1' }),
    ], 3),
    page([entry('/system', { Type: 'SystemFolder', IsFolder: true, Hidden: true })], 3),
    page([], 3),
  ]);
  const report = await generateSitemapReport({ ...ENV, REACT_APP_WIDGET_TYPE: 'MagazineWidget' }, api.fetchImpl, { now });
  assert.deepEqual(urls(report.xml), ['https://magazine.example/', 'https://magazine.example/private-sibling/story']);
  const excluded = new Map(report.excluded.map(item => [item.path, item.reason]));
  for (const name of ['private/secret', 'widget/story', 'system/story']) assert.equal(excluded.get(`${ROOT}/${name}`), 'hidden-ancestor', name);
  for (const name of ['private', 'widget', 'system']) assert.equal(excluded.get(`${ROOT}/${name}`), 'hidden', name);
  const hiddenRequests = api.calls.filter(({ url }) => url.searchParams.get('query').includes('+Hidden:1'));
  assert.deepEqual(hiddenRequests.map(({ url }) => /\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1]), ['0', '2', '3']);
  assert.equal(new Set(api.calls.map(({ options }) => options.signal)).size, 1, 'both streams share one deadline');
  for (const { url, options } of hiddenRequests) {
    assert.equal(url.searchParams.get('$select'), 'Id,Path,Type,Hidden,IsFolder');
    assert.equal(url.searchParams.get('enablelifespanfilter'), 'false');
    assert.equal(url.searchParams.get('enableautofilters'), 'false');
    assert.doesNotMatch(url.searchParams.get('query'), /-TypeIs:/);
    assert.equal(options.credentials, 'omit');
    assert.equal(new Headers(options.headers).has('authorization'), false);
  }
});

test('a hidden site root excludes all descendants and cannot produce a public sitemap', async () => {
  const api = repository([page([entry('/published-child', { DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z' })]), page([])], [
    page([entry('', { IsFolder: true, Hidden: true })]), page([]),
  ]);
  await assert.rejects(generateSitemap(ENV, api.fetchImpl), /No public pages/);
});

test('a later hidden flag overrides an earlier visible copy and excludes its descendants', async () => {
  const api = repository([page([
    entry('', { IsFolder: true, DisplayZone: [] }),
    entry('/became-hidden', { Type: 'LeisureCategory', IsFolder: true, Hidden: false }),
    entry('/became-hidden/published', { Hidden: false, DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z' }),
  ]), page([])], [page([
    entry('/became-hidden', { Type: 'Folder', IsFolder: true, Hidden: true, DisplayZone: undefined }),
  ]), page([])]);
  const report = await generateSitemapReport(ENV, api.fetchImpl);
  assert.deepEqual(urls(report.xml), ['https://magazine.example/']);
  assert.deepEqual(report.excluded.map(item => [item.path, item.type, item.reason]), [
    [`${ROOT}/became-hidden`, 'LeisureCategory', 'hidden'],
    [`${ROOT}/became-hidden/published`, 'Article', 'hidden-ancestor'],
  ]);
});

test('hidden inventory failures never return a partial public sitemap', async t => {
  const hidden = entry('/private', { Type: 'SystemFolder', Hidden: true });
  const cases = [
    ['transport error', [new Error('hidden inventory unavailable')]],
    ['HTTP failure', [new Response('unavailable', { status: 503 })]],
    ['malformed response', [{ d: {} }]],
    ['incomplete response', [page([hidden], 2), page([], 2)]],
    ['repeated page', [page([hidden]), page([hidden])]],
  ];
  for (const [name, hiddenPages] of cases) await t.test(name, async () => {
    const api = repository([page([entry('/visible')]), page([])], hiddenPages);
    await assert.rejects(generateSitemap(ENV, api.fetchImpl));
  });
});

test('requires an exact stored menu token and does not treat choice labels or lookalikes as navigation', async () => {
  const selected = [
    entry('/array-item', { DisplayZone: ['other', 'menuitem'] }),
    entry('/array-icon', { DisplayZone: ['menuicon'] }),
    entry('/string-item', { DisplayZone: 'menuitem' }),
    entry('/string-icon', { DisplayZone: 'menuicon' }),
  ];
  const ignored = ['Menu item', 'notmenuitem', 'menuitems', 'prefix-menuicon', 'menuicon-suffix', ''].map((DisplayZone, index) =>
    entry(`/lookalike-${index}`, { DisplayZone }));
  ignored.push(entry('/array-lookalike', { DisplayZone: ['notmenuitem', 'Menu item'] }));
  const api = repository([page([...selected, ...ignored])]);
  assert.deepEqual(urls(await generateSitemap(ENV, api.fetchImpl)), selected.map(item => `https://magazine.example${item.Path.slice(ROOT.length)}`).sort());
});

test('publication dates gate root and navigation too, with exact-now inclusion and ISO or .NET future exclusion', async () => {
  const now = '2026-10-23T12:00:00.000Z';
  const milliseconds = Date.parse(now);
  const api = repository([page([
    entry('', { Type: 'Workspace', IsFolder: true, PublishDate: '2026-10-23T12:00:00.001Z' }),
    entry('/at-now', { DisplayZone: [], PublishDate: now }),
    entry('/at-now-dotnet', { DisplayZone: [], PublishDate: `/Date(${milliseconds}+0200)/` }),
    entry('/equivalent-offset', { DisplayZone: [], PublishDate: '2026-10-23T14:00:00+02:00' }),
    entry('/future-menu', { PublishDate: '2026-10-23T12:00:00.001Z' }),
    entry('/future-dotnet', { DisplayZone: [], PublishDate: `/Date(${milliseconds + 1})/` }),
    entry('/bad-menu', { PublishDate: 'not a date' }),
    entry('/bad-editorial', { DisplayZone: [], PublishDate: '/Date(broken)/' }),
    entry('/impossible-date', { PublishDate: '2026-99-99T00:00:00Z' }),
    entry('/invalid-calendar-date', { PublishDate: '2025-02-29T00:00:00Z' }),
    entry('/null-menu', { PublishDate: null }),
    entry('/blank-menu', { PublishDate: '  ' }),
    entry('/null-editorial', { DisplayZone: [], PublishDate: null }),
    entry('/blank-editorial', { DisplayZone: [], PublishDate: '' }),
  ])]);
  const report = await generateSitemapReport(ENV, api.fetchImpl, { now });
  assert.deepEqual(urls(report.xml), ['at-now', 'at-now-dotnet', 'blank-menu', 'equivalent-offset', 'null-menu'].map(name => `https://magazine.example/${name}`));
  const excluded = new Map(report.excluded.map(item => [item.path, item.reason]));
  for (const name of ['', '/future-menu', '/future-dotnet']) assert.equal(excluded.get(`${ROOT}${name}`), 'future-publish-date', name || 'root');
  for (const name of ['bad-menu', 'bad-editorial', 'impossible-date', 'invalid-calendar-date']) assert.equal(excluded.get(`${ROOT}/${name}`), 'invalid-publish-date', name);
  for (const name of ['null-editorial', 'blank-editorial']) assert.equal(excluded.get(`${ROOT}/${name}`), 'not-navigation-or-published-content', name);
});

test('never advertises external link records even when they have menu placement or a published date', async () => {
  const now = '2026-10-23T12:00:00.000Z';
  const api = repository([page([
    entry('/internal', { Url: '  ' }),
    entry('/url', { Url: 'https://external.example/page' }),
    entry('/relative-url', { DisplayZone: [], PublishDate: now, Url: '/linked-destination' }),
    entry('/softlink', { Type: 'SoftLink', PublishDate: now }),
    entry('/banner', { Type: 'Banner', PublishDate: now }),
  ])]);
  const report = await generateSitemapReport(ENV, api.fetchImpl, { now });
  assert.deepEqual(urls(report.xml), ['https://magazine.example/internal']);
  assert.equal(report.excluded.length, 4);
  for (const item of report.excluded) {
    assert.equal(item.reason, 'external-link', item.path);
    assert.equal(typeof item.path, 'string');
    assert.equal(typeof item.type, 'string');
  }
});

test('treats ISO and .NET DateTime.MinValue as unset publication and modification dates', async () => {
  const minimumIso = '0001-01-01T00:00:00Z';
  const minimumDotNet = '/Date(-62135596800000)/';
  const api = repository([page([
    entry('', { Type: 'Workspace', IsFolder: true, DisplayZone: [], PublishDate: minimumIso, ModificationDate: minimumIso }),
    entry('/navigation', { PublishDate: minimumDotNet, ModificationDate: minimumDotNet }),
    entry('/unmarked-iso', { DisplayZone: [], PublishDate: minimumIso }),
    entry('/unmarked-dotnet', { DisplayZone: [], PublishDate: minimumDotNet }),
    entry('/published-iso-modification', { DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z', ModificationDate: minimumIso }),
    entry('/published-dotnet-modification', { DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z', ModificationDate: minimumDotNet }),
  ])]);
  const report = await generateSitemapReport(ENV, api.fetchImpl, { now: '2026-10-23T12:00:00Z' });
  assert.deepEqual(urls(report.xml), ['', 'navigation', 'published-dotnet-modification', 'published-iso-modification'].map(name => `https://magazine.example/${name}`));
  assert.doesNotMatch(report.xml, /0001-01-01/);
  for (const item of report.entries) {
    assert.equal(item.lastmod, item.reason === 'published-content' ? '2025-01-01T00:00:00.000Z' : '');
  }
  assert.deepEqual(new Map(report.excluded.map(item => [item.path, item.reason])), new Map([
    [`${ROOT}/unmarked-iso`, 'not-navigation-or-published-content'],
    [`${ROOT}/unmarked-dotnet`, 'not-navigation-or-published-content'],
  ]));
});

test('accepts deterministic Date, number and string clocks and rejects invalid clocks before fetching', async t => {
  const now = '2026-10-23T12:00:00.000Z';
  for (const clock of [new Date(now), Date.parse(now), now]) {
    const api = repository([page([entry('/published', { DisplayZone: [], PublishDate: now })])]);
    assert.equal((await generateSitemapReport(ENV, api.fetchImpl, { now: clock })).asOf, now);
  }
  for (const clock of [new Date(NaN), NaN, Infinity, 'invalid date', null, {}, []]) {
    await t.test(`invalid clock ${String(clock)}`, async () => {
      const api = repository([page([entry('/never-fetch')])]);
      await assert.rejects(generateSitemap(ENV, api.fetchImpl, { now: clock }));
      assert.equal(api.calls.length, 0);
    });
  }
});

test('captures the default clock once before repository paging and keeps it fixed across fetches', async t => {
  const now = '2026-10-23T12:00:00.000Z';
  const milliseconds = Date.parse(now);
  let currentTime = milliseconds;
  const clock = t.mock.method(Date, 'now', () => currentTime);
  const api = repository([page([
    entry('/at-start', { DisplayZone: [], PublishDate: now }),
    entry('/after-start', { DisplayZone: [], PublishDate: '2026-10-23T12:00:00.001Z' }),
  ])]);
  const fetchImpl = async (...args) => {
    currentTime = milliseconds + 60000;
    return api.fetchImpl(...args);
  };
  const report = await generateSitemapReport(ENV, fetchImpl);
  assert.equal(report.asOf, now);
  assert.deepEqual(urls(report.xml), ['https://magazine.example/at-start']);
  assert.equal(clock.mock.callCount(), 1);
});

test('omits the configured uploaded sitemap even if the repository labels it as a page', async () => {
  const api = repository([page([entry('/article'), entry('/seo/public.xml')])]);
  const xml = await generateSitemap({ ...ENV, REACT_APP_SITEMAP_PATH: '/seo/public.xml' }, api.fetchImpl);
  assert.deepEqual(urls(xml), ['https://magazine.example/article']);
});

test('real HTTP fetch remains anonymous and reads every server-capped page through the empty terminator', async t => {
  const rows = [entry(''), entry('/one'), entry('/two'), entry('/three'), entry('/four')];
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push({ url, method: request.method, headers: request.headers });
    const query = url.searchParams.get('query') || '';
    const skip = Number(/\.SKIP:(\d+)/.exec(query)?.[1] ?? NaN);
    const matchingRows = query.includes('+Hidden:1') ? rows.filter(row => row.Hidden === true) : rows;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(page(matchingRows.slice(skip, skip + 2), matchingRows.length)));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const env = { ...ENV, REACT_APP_API_URL: `http://127.0.0.1:${server.address().port}/repository` };
  const xml = await generateSitemap({ ...env, SENSENET_API_KEY: 'private-fixture-only' });
  assert.deepEqual(urls(xml), [
    'https://magazine.example/', 'https://magazine.example/four',
    'https://magazine.example/one', 'https://magazine.example/three', 'https://magazine.example/two',
  ]);
  assert.equal(requests.length, 5, 'main pages terminate with an empty page and hidden inventory is checked separately');
  assert.deepEqual(requests.map(({ url }) => Number(/\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1])), [0, 2, 4, 5, 0]);
  for (const request of requests) {
    assert.equal(request.method, 'GET');
    assert.equal(request.url.pathname, '/repository/OData.svc/Root/Content');
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers.apikey, undefined);
    assert.equal(request.headers.accept, 'application/json');
    const query = request.url.searchParams.get('query');
    const isHidden = query.includes('+Hidden:1');
    assert.equal(request.url.searchParams.get('$select'), isHidden ? 'Id,Path,Type,Hidden,IsFolder' : 'Id,Path,Type,Hidden,IsFolder,ModificationDate,PublishDate,DisplayZone,Url');
    assert.equal(request.url.searchParams.get('$inlinecount'), 'allpages');
    assert.equal(request.url.searchParams.get('metadata'), 'no');
    assert.equal(request.url.searchParams.get('enableautofilters'), isHidden ? 'false' : 'true');
    assert.equal(request.url.searchParams.get('enablelifespanfilter'), isHidden ? 'false' : 'true');
    assert.ok(query.includes(`+InTree:${JSON.stringify(ROOT)}`));
    const clauses = isHidden ? ['+Hidden:1', '.SORT:Id', '.TOP:500'] : ['+Hidden:0', '-TypeIs:File', '-TypeIs:SystemFolder', '-TypeIs:Widget', '.SORT:Id', '.TOP:500'];
    for (const clause of clauses) {
      assert.ok(query.split(' ').includes(clause), clause);
    }
  }
});

test('query safely quotes a configured repository root and explicitly omits credentials and redirects', async () => {
  const root = '/Root/Content/Quoted "Magazine"';
  const api = repository([page([entry('', { Path: `${root}/article` })])]);
  await generateSitemap({ ...ENV, REACT_APP_DATA_PATH: root }, api.fetchImpl);
  for (const { url, options } of api.calls) {
    assert.ok(url.searchParams.get('query').includes(`+InTree:${JSON.stringify(root)}`));
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.signal instanceof AbortSignal, true);
    const headers = new Headers(options.headers);
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('cookie'), null);
    assert.equal(headers.get('accept'), 'application/json');
  }
});

test('continues paging without a count and despite changing advertised counts', async () => {
  const api = repository([
    page([entry('/one')]),
    page([entry('/two')], 1),
    page([entry('/three')], 3),
    page([], 3),
  ]);
  const xml = await generateSitemap(ENV, api.fetchImpl);
  assert.equal(urls(xml).length, 3);
  assert.deepEqual(api.calls.map(({ url }) => /\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1]), ['0', '1', '2', '3', '0']);
});

test('rejects upstream failures and malformed or incomplete responses instead of returning partial XML', async t => {
  const cases = [
    ['transport error', [new Error('fixture network failure')]],
    ['repository rejects anonymous access', [new Response('denied', { status: 403 })]],
    ['repository server error', [new Response('unavailable', { status: 500 })]],
    ['invalid JSON', [new Response('{broken', { headers: { 'Content-Type': 'application/json' } })]],
    ['missing envelope', [{}]],
    ['missing results', [{ d: {} }]],
    ['non-array results', [{ d: { results: { Path: ROOT } } }]],
    ['null content row', [page([null])]],
    ['empty repository', [page([])]],
    ['no public pages', [page([entry('/widget', { Type: 'Widget' })])]],
    ['later HTTP failure', [page([entry('/partial')], 2), new Response('unavailable', { status: 503 })]],
    ['later malformed JSON', [page([entry('/partial')]), new Response('{broken')]],
    ['later transport failure', [page([entry('/partial')]), new Error('fixture network failure')]],
    ['premature empty page', [page([entry('/partial')], 2), page([], 2)]],
    ['repeated page', [page([entry('/partial')]), page([entry('/partial')])]],
  ];
  for (const [name, pages] of cases) {
    await t.test(name, async () => {
      const api = repository(pages);
      await assert.rejects(generateSitemap(ENV, api.fetchImpl));
    });
  }
});

test('a failed generation cannot return partial XML or reuse an earlier result', async () => {
  const success = repository([page([entry('/previous-success')])]);
  assert.deepEqual(urls(await generateSitemap(ENV, success.fetchImpl)), ['https://magazine.example/previous-success']);
  const failure = repository([page([entry('/partial')]), new Error('fixture failure')]);
  await assert.rejects(generateSitemap(ENV, failure.fetchImpl), /fixture failure/);
  const recovered = repository([page([entry('/recovered')])]);
  assert.deepEqual(urls(await generateSitemap(ENV, recovered.fetchImpl)), ['https://magazine.example/recovered']);
});

test('invalid configuration fails before contacting the repository', async t => {
  const cases = [
    ['missing API', { REACT_APP_API_URL: undefined }],
    ['insecure remote API', { REACT_APP_API_URL: 'http://repository.example' }],
    ['credentials in API URL', { REACT_APP_API_URL: 'https://fixture:password@repository.example' }],
    ['query in API URL', { REACT_APP_API_URL: 'https://repository.example?token=fixture' }],
    ['fragment in API URL', { REACT_APP_API_URL: 'https://repository.example#fragment' }],
    ['missing canonical origin', { REACT_APP_SITE_HOST: undefined }],
    ['insecure canonical origin', { REACT_APP_SITE_HOST: 'http://magazine.example' }],
    ['canonical origin has a path', { REACT_APP_SITE_HOST: 'https://magazine.example/news' }],
    ['canonical origin has credentials', { REACT_APP_SITE_HOST: 'https://fixture:password@magazine.example' }],
    ['canonical origin has a query', { REACT_APP_SITE_HOST: 'https://magazine.example?view=preview' }],
    ['canonical origin has a fragment', { REACT_APP_SITE_HOST: 'https://magazine.example#news' }],
    ['missing root', { REACT_APP_DATA_PATH: undefined }],
    ['root outside public content', { REACT_APP_DATA_PATH: '/Root/System' }],
    ['similar root prefix', { REACT_APP_DATA_PATH: '/Root/Contents/Magazine' }],
    ['parent traversal', { REACT_APP_DATA_PATH: `${ROOT}/../AnotherMagazine` }],
    ['dot traversal', { REACT_APP_DATA_PATH: `${ROOT}/./news` }],
    ['backslash in root', { REACT_APP_DATA_PATH: `${ROOT}\\news` }],
    ['query in root', { REACT_APP_DATA_PATH: `${ROOT}?query` }],
    ['fragment in root', { REACT_APP_DATA_PATH: `${ROOT}#fragment` }],
    ['invalid widget type', { REACT_APP_WIDGET_TYPE: 'Widget -TypeIs:Article' }],
  ];
  for (const [name, overrides] of cases) {
    await t.test(name, async () => {
      const api = repository([page([entry('/should-not-be-fetched')])]);
      await assert.rejects(generateSitemap({ ...ENV, ...overrides }, api.fetchImpl));
      assert.equal(api.calls.length, 0);
    });
  }
});

test('build routing is disabled without the optional sitemap path and requires no other new configuration', () => {
  const redirects = '# existing routing\n/*  /index.html  200\n';
  const robots = 'User-agent: *\nDisallow:\n';
  for (const env of [{}, { REACT_APP_SITEMAP_PATH: '' }, { REACT_APP_SITEMAP_PATH: '   ' }]) {
    assert.deepEqual(buildRouting(env, redirects, robots), { redirects, robots });
  }
});

test('build routing writes a fixed escaped external 200! proxy ahead of SPA routing and a canonical robots URL', t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('build must not use the network'); });
  const redirects = '/old  /new  301\n/*  /index.html  200\n';
  const robots = '# static file\nUser-agent: *\nDisallow:\n';
  const generated = buildRouting({
    ...ENV,
    REACT_APP_API_URL: 'https://repository.example/service',
    REACT_APP_DATA_PATH: '/Root/Content/Árvíz Magazine',
    REACT_APP_SITEMAP_PATH: '/SEO files/it\'s & <public>.xml',
    SENSENET_API_KEY: 'private-fixture-key',
    SENSENET_ACCESS_TOKEN: 'private-fixture-token',
  }, redirects, robots);
  assert.equal(generated.redirects,
    '/sitemap.xml  https://repository.example/service/Root/Content/%C3%81rv%C3%ADz%20Magazine/SEO%20files/it%27s%20%26%20%3Cpublic%3E.xml  200!\n' + redirects);
  assert.equal(generated.robots, '# static file\nUser-agent: *\nDisallow:\n\nSitemap: https://magazine.example/sitemap.xml\n');
  assert.doesNotMatch(JSON.stringify(generated), /private-fixture|apikey|Authorization|\.netlify\/functions|:splat/);
  assert.equal(network.mock.callCount(), 0);
});

test('sitemap settings combine only a raw site-relative XML path with the exact configured content root', () => {
  const settings = readSiteSettings({ ...ENV, REACT_APP_SITEMAP_PATH: '/SEO maps/public.xml' }, { requireSitemap: true });
  assert.equal(settings.repositoryPath, `${ROOT}/SEO maps/public.xml`);
  assert.equal(settings.sitemapUrl, 'https://repository.example/Root/Content/Magazine/SEO%20maps/public.xml');
  assert.equal(settings.origin, 'https://magazine.example');
  assert.equal(readSiteSettings(ENV).repositoryPath, null);
  assert.throws(() => readSiteSettings(ENV, { requireSitemap: true }), /SITEMAP_PATH is required/);
});

test('build routing rejects invalid or ambiguous paths and incomplete opt-in configuration', async t => {
  const cases = [
    ['absolute URL', 'https://other.example/sitemap.xml'],
    ['protocol-relative URL', '//other.example/sitemap.xml'],
    ['missing leading slash', 'sitemap.xml'],
    ['parent traversal', '/../sitemap.xml'],
    ['dot traversal', '/seo/./sitemap.xml'],
    ['double slash', '/seo//sitemap.xml'],
    ['backslash', '/seo\\sitemap.xml'],
    ['query', '/sitemap.xml?draft=true'],
    ['fragment', '/sitemap.xml#draft'],
    ['encoded traversal', '/%2e%2e/sitemap.xml'],
    ['already escaped path', '/SEO%20maps/sitemap.xml'],
    ['control character', '/seo\n/sitemap.xml'],
    ['wrong extension', '/sitemap.json'],
  ];
  for (const [name, path] of cases) {
    await t.test(name, () => assert.throws(() => buildRouting({ ...ENV, REACT_APP_SITEMAP_PATH: path }, '/* /index.html 200\n', 'User-agent: *\n')));
  }
  for (const name of ['REACT_APP_API_URL', 'REACT_APP_DATA_PATH', 'REACT_APP_SITE_HOST']) {
    await t.test(`missing ${name}`, () => assert.throws(() => buildRouting({ ...ENV, [name]: undefined, REACT_APP_SITEMAP_PATH: '/sitemap.xml' }, '', '')));
  }
  assert.throws(() => buildRouting({ ...ENV, REACT_APP_SITEMAP_PATH: '/sitemap.xml' }, '/sitemap.xml /old.xml 200\n/* /index.html 200\n', ''), /already contain a sitemap rule/);
});

test('checked-in static routes and robots do not depend on Functions or a configured sitemap', async () => {
  const [redirects, robots] = await Promise.all([
    readFile(new URL('../public/_redirects', import.meta.url), 'utf8'),
    readFile(new URL('../public/robots.txt', import.meta.url), 'utf8'),
  ]);
  assert.match(redirects, /^\/\*\s+\/index\.html\s+200\s*$/m);
  assert.doesNotMatch(redirects, /\.netlify\/functions|^\/sitemap\.xml\s/m);
  assert.doesNotMatch(robots, /Sitemap:/);
  assert.deepEqual(buildRouting({}, redirects, robots), { redirects, robots });
});
