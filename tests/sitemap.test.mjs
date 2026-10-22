import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { generateSitemap } from '../scripts/lib/sitemap.mjs';
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
    ModificationDate: '2026-10-18T10:20:30Z',
    ...overrides,
  };
}

function page(results, count) {
  return { d: { results, ...(count === undefined ? {} : { __count: String(count) }) } };
}

function repository(pages) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const index = calls.length;
    calls.push({ url: new URL(url), options });
    const next = pages[index] ?? page([]);
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

test('lastmod uses article source timestamps, including .NET dates, and omits folder or invalid dates', async () => {
  const timestamp = Date.parse('2025-04-05T06:07:08.123Z');
  const api = repository([page([
    entry('/source', { ModificationDate: '2024-03-02T13:14:15+02:00' }),
    entry('/dotnet', { ModificationDate: `/Date(${timestamp}+0200)/` }),
    entry('/folder', { Type: 'Folder', IsFolder: true }),
    entry('/unknown-folder-status', { IsFolder: undefined }),
    entry('/bad-date', { ModificationDate: 'not a date' }),
    entry('/missing-date', { ModificationDate: undefined }),
    entry('/impossible-date', { ModificationDate: '2025-99-99T00:00:00Z' }),
  ])]);
  const entries = xmlEntries(await generateSitemap(ENV, api.fetchImpl));
  assert.equal(entries.get('https://magazine.example/source'), '<lastmod>2024-03-02T11:14:15.000Z</lastmod>');
  assert.equal(entries.get('https://magazine.example/dotnet'), '<lastmod>2025-04-05T06:07:08.123Z</lastmod>');
  for (const name of ['folder', 'unknown-folder-status', 'bad-date', 'missing-date', 'impossible-date']) {
    assert.equal(entries.get(`https://magazine.example/${name}`), '', name);
  }
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
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(page(rows.slice(skip, skip + 2), rows.length)));
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
  assert.equal(requests.length, 4, 'must fetch an empty page after the last short page');
  assert.deepEqual(requests.map(({ url }) => Number(/\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1])), [0, 2, 4, 5]);
  for (const request of requests) {
    assert.equal(request.method, 'GET');
    assert.equal(request.url.pathname, '/repository/OData.svc/Root/Content');
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers.apikey, undefined);
    assert.equal(request.headers.accept, 'application/json');
    assert.equal(request.url.searchParams.get('$select'), 'Id,Path,Type,Hidden,IsFolder,ModificationDate');
    assert.equal(request.url.searchParams.get('$inlinecount'), 'allpages');
    assert.equal(request.url.searchParams.get('metadata'), 'no');
    assert.equal(request.url.searchParams.get('enableautofilters'), 'true');
    assert.equal(request.url.searchParams.get('enablelifespanfilter'), 'true');
    const query = request.url.searchParams.get('query');
    assert.ok(query.includes(`+InTree:${JSON.stringify(ROOT)}`));
    for (const clause of ['+Hidden:0', '-TypeIs:File', '-TypeIs:SystemFolder', '-TypeIs:Widget', '.SORT:Id', '.TOP:500']) {
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
  assert.deepEqual(api.calls.map(({ url }) => /\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1]), ['0', '1', '2', '3']);
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
