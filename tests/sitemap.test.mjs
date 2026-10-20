import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { generateSitemap, handleRobots, handleSitemap } from '../netlify/lib/sitemap.mjs';
import sitemapFunction from '../netlify/functions/sitemap.mjs';
import robotsFunction from '../netlify/functions/robots.mjs';

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

function assertNotCached(response) {
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Netlify-CDN-Cache-Control'), 'no-store');
}

async function assertUnavailable(response, { head = false } = {}) {
  assert.equal(response.status, 503);
  assertNotCached(response);
  assert.equal(response.headers.get('Retry-After'), '300');
  assert.equal(response.headers.get('Content-Type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), head ? '' : 'Sitemap temporarily unavailable\n');
}

function installEnvironment(t, values) {
  const names = [...Object.keys(ENV), 'REACT_APP_WIDGET_TYPE'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  for (const name of names) {
    if (values[name] === undefined) delete process.env[name];
    else process.env[name] = values[name];
  }
  t.after(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
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

test('sitemap and robots use the configured canonical origin independently of request URL or Host', async () => {
  const request = new Request('https://preview.example/sitemap.xml', { headers: { Host: 'attacker.example' } });
  const api = repository([page([entry('/article')])]);
  const response = await handleSitemap(request, ENV, api.fetchImpl);
  assert.equal(response.status, 200);
  assert.deepEqual(urls(await response.text()), ['https://magazine.example/article']);
  const robots = handleRobots(new Request('https://preview.example/robots.txt', {
    headers: { Host: 'attacker.example' },
  }), ENV);
  assert.equal(robots.status, 200);
  assert.equal(await robots.text(), 'User-agent: *\nDisallow:\n\nSitemap: https://magazine.example/sitemap.xml\n');
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
  const response = await handleSitemap(new Request('https://preview.example/sitemap.xml', {
    headers: { Authorization: 'Bearer fixture-only', Cookie: 'session=fixture-only', Host: 'spoofed.example' },
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(urls(await response.text()), [
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

test('returns 503 with no caching or partial XML for upstream failures and malformed responses', async t => {
  t.mock.method(console, 'error', () => {});
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
      await assertUnavailable(await handleSitemap(new Request('https://magazine.example/sitemap.xml'), ENV, api.fetchImpl));
    });
  }
});

test('a failed request cannot return or cache the partial XML from an earlier successful request', async t => {
  t.mock.method(console, 'error', () => {});
  const request = new Request('https://magazine.example/sitemap.xml');
  const success = repository([page([entry('/previous-success')])]);
  assert.equal((await handleSitemap(request, ENV, success.fetchImpl)).status, 200);
  const failure = repository([page([entry('/partial')]), new Error('fixture failure')]);
  await assertUnavailable(await handleSitemap(request, ENV, failure.fetchImpl));
  const recovered = repository([page([entry('/recovered')])]);
  assert.deepEqual(urls(await (await handleSitemap(request, ENV, recovered.fetchImpl)).text()), ['https://magazine.example/recovered']);
});

test('invalid configuration returns an uncached 503 before contacting the repository', async t => {
  t.mock.method(console, 'error', () => {});
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
      await assertUnavailable(await handleSitemap(new Request('https://preview.example/sitemap.xml'), { ...ENV, ...overrides }, api.fetchImpl));
      assert.equal(api.calls.length, 0);
    });
  }
});

test('successful GET and HEAD advertise XML and CDN caching, with no HEAD body', async () => {
  for (const method of ['GET', 'HEAD']) {
    const api = repository([page([entry('/article')])]);
    const response = await handleSitemap(new Request('https://magazine.example/sitemap.xml', { method }), ENV, api.fetchImpl);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'application/xml; charset=utf-8');
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('Netlify-CDN-Cache-Control'), 'public, durable, max-age=86400, must-revalidate');
    if (method === 'HEAD') assert.equal(await response.text(), '');
    else assert.deepEqual(urls(await response.text()), ['https://magazine.example/article']);
  }
});

test('HEAD failures remain bodyless and uncached', async t => {
  t.mock.method(console, 'error', () => {});
  const api = repository([new Error('fixture failure')]);
  await assertUnavailable(await handleSitemap(new Request('https://magazine.example/sitemap.xml', { method: 'HEAD' }), ENV, api.fetchImpl), { head: true });
  const robots = handleRobots(new Request('https://magazine.example/robots.txt', { method: 'HEAD' }), {});
  assert.equal(robots.status, 503);
  assertNotCached(robots);
  assert.equal(await robots.text(), '');
});

test('unsupported methods receive 405 and Allow without fetching repository data', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const api = repository([]);
    const request = new Request('https://magazine.example/sitemap.xml', { method });
    for (const response of [await handleSitemap(request, ENV, api.fetchImpl), handleRobots(request, ENV)]) {
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('Allow'), 'GET, HEAD');
      assertNotCached(response);
      assert.equal(await response.text(), 'Method not allowed\n');
    }
    assert.equal(api.calls.length, 0);
  }
});

test('robots GET/HEAD use matching cache headers and reject invalid canonical configuration', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = handleRobots(new Request('https://preview.example/robots.txt', { method }), ENV);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/plain; charset=utf-8');
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('Netlify-CDN-Cache-Control'), 'public, durable, max-age=86400, must-revalidate');
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'User-agent: *\nDisallow:\n\nSitemap: https://magazine.example/sitemap.xml\n');
  }
  const invalid = handleRobots(new Request('https://magazine.example/robots.txt'), {
    ...ENV, REACT_APP_SITE_HOST: 'https://magazine.example/not-an-origin',
  });
  assert.equal(invalid.status, 503);
  assertNotCached(invalid);
  assert.equal(await invalid.text(), 'Robots configuration temporarily unavailable\n');
});

test('actual Netlify function entry points use deployment environment and request objects', async t => {
  installEnvironment(t, ENV);
  const api = repository([page([entry('/routed')])]);
  t.mock.method(globalThis, 'fetch', api.fetchImpl);
  const response = await sitemapFunction(new Request('https://preview.example/.netlify/functions/sitemap'));
  assert.equal(response.status, 200);
  assert.deepEqual(urls(await response.text()), ['https://magazine.example/routed']);
  assert.equal(api.calls[0].url.origin, ENV.REACT_APP_API_URL);
  const robots = await robotsFunction(new Request('https://preview.example/.netlify/functions/robots'));
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/magazine\.example\/sitemap\.xml\n$/);
});

test('public sitemap and robots rewrites are forced before the SPA fallback', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  const rules = redirects.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    .map(line => line.split(/\s+/));
  const fallbackIndex = rules.findIndex(([from, to]) => from === '/*' && to === '/index.html');
  assert.notEqual(fallbackIndex, -1);
  for (const [route, target] of [['/sitemap.xml', '/.netlify/functions/sitemap'], ['/robots.txt', '/.netlify/functions/robots']]) {
    const index = rules.findIndex(([from]) => from === route);
    assert.ok(index >= 0 && index < fallbackIndex, `${route} must precede the SPA fallback`);
    assert.deepEqual(rules[index], [route, target, '200!']);
  }
});
