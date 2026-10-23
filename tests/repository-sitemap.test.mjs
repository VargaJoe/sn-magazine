import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { updateRepositorySitemap } from '../scripts/lib/repository-sitemap.mjs';

const ROOT = '/Root/Content/Magazine';
const TARGET = `${ROOT}/SEO/sitemap.xml`;
const PARENT = `${ROOT}/SEO`;
const TARGET_ITEM = "/OData.svc/Root/Content/Magazine/SEO('sitemap.xml')";
const PARENT_ITEM = "/OData.svc/Root/Content/Magazine('SEO')";
const ENV = {
  REACT_APP_API_URL: 'https://repository.example',
  REACT_APP_DATA_PATH: ROOT,
  REACT_APP_SITE_HOST: 'https://magazine.example',
  REACT_APP_SITEMAP_PATH: '/SEO/sitemap.xml',
  SENSENET_API_KEY: 'private-fixture-key',
};
const ROWS = [
  { Id: 1, Path: ROOT, Type: 'Folder', IsFolder: true, Hidden: false },
  { Id: 2, Path: `${ROOT}/Árvíz tér`, Type: 'Article', IsFolder: false, Hidden: false, DisplayZone: ['menuitem'], ModificationDate: '2026-10-18T10:20:30Z' },
];
const EXPECTED_XML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  '  <url><loc>https://magazine.example/</loc></url>\n' +
  '  <url><loc>https://magazine.example/%C3%81rv%C3%ADz%20t%C3%A9r</loc><lastmod>2026-10-18T10:20:30.000Z</lastmod></url>\n' +
  '</urlset>\n';
const OLD_XML = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://magazine.example/old</loc></url></urlset>';
const TARGET_METADATA = { Id: 30, Path: TARGET, Type: 'File', IsFolder: false, Locked: false };
const PARENT_METADATA = { Id: 20, Path: PARENT, Type: 'Folder', IsFolder: true, Locked: false };

function xmlResponse(xml, type = 'application/xml; charset=utf-8', status = 200) {
  return new Response(xml, { status, headers: type === null ? {} : { 'Content-Type': type } });
}

function fixture(options = {}) {
  const state = { calls: [], uploads: [], publicXml: options.oldXml ?? OLD_XML, publicReads: 0, sourceReads: 0 };
  const fetchImpl = async (input, request = {}) => {
    const url = new URL(input);
    const path = decodeURIComponent(url.pathname);
    let kind;
    if (path === '/OData.svc/Root/Content') kind = 'source';
    else if (path === TARGET) kind = 'public';
    else if (path === TARGET_ITEM) kind = 'target';
    else if (path === PARENT_ITEM) kind = 'parent';
    else if (path === `${TARGET_ITEM}/HasPermission` || path === `${PARENT_ITEM}/HasPermission`) kind = 'permission';
    else if (path === `${PARENT_ITEM}/Upload`) kind = 'upload';
    else throw new Error(`Unexpected fixture request: ${url}`);
    const call = { kind, url, request, headers: new Headers(request.headers) };
    state.calls.push(call);
    if (kind === 'public') state.publicReads++;
    if (kind === 'source') state.sourceReads++;
    if (kind === 'upload') state.uploads.push(call);
    const override = options.overrides?.[kind];
    if (override !== undefined) {
      if (override instanceof Error) throw override;
      return typeof override === 'function' ? override(call, state) : override.clone();
    }
    if (kind === 'target') return options.exists === false
      ? new Response('not found', { status: 404 }) : Response.json({ d: { ...TARGET_METADATA, ...options.target } });
    if (kind === 'parent') return Response.json({ d: { ...PARENT_METADATA, ...options.parent } });
    if (kind === 'permission') return Response.json(true);
    if (kind === 'source') {
      if (options.sourcePages) {
        const next = options.sourcePages[state.sourceReads - 1] ?? { d: { results: [] } };
        if (next instanceof Error) throw next;
        return next instanceof Response ? next.clone() : Response.json(next);
      }
      const skip = Number(/\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1]);
      const rows = url.searchParams.get('query').includes('+Hidden:1') ? options.hiddenRows || [] : options.rows || ROWS;
      return Response.json({ d: { results: rows.slice(skip, skip + 1), __count: String(rows.length) } });
    }
    if (kind === 'upload') {
      state.publicXml = await request.body.get('sitemap.xml').text();
      return Response.json({ uploaded: true });
    }
    return xmlResponse(state.publicXml);
  };
  return { state, fetchImpl };
}

function assertNoWrites(api) {
  assert.equal(api.state.uploads.length, 0);
  assert.equal(api.state.calls.some(({ request }) => !['GET', 'HEAD'].includes(request.method || 'GET')), false);
}

function assertSafeTransport(api, { token = false } = {}) {
  for (const { kind, request, headers } of api.state.calls) {
    assert.equal(request.credentials, 'omit', kind);
    assert.equal(request.redirect, 'error', kind);
    assert.equal(request.signal instanceof AbortSignal, true, kind);
    assert.equal(headers.has('cookie'), false, kind);
    if (kind === 'source' || kind === 'public') {
      assert.equal(headers.has('apikey'), false, kind);
      assert.equal(headers.has('authorization'), false, kind);
    } else if (token) {
      assert.equal(headers.get('authorization'), 'Bearer private-fixture-token', kind);
      assert.equal(headers.has('apikey'), false, kind);
    } else {
      assert.equal(headers.get('apikey'), 'private-fixture-key', kind);
      assert.equal(headers.has('authorization'), false, kind);
    }
    if (kind === 'public') {
      assert.equal(request.cache, 'no-store');
      assert.equal(headers.get('cache-control'), 'no-cache');
      assert.equal(headers.get('accept'), 'application/xml, text/xml');
    }
  }
}

test('requires exactly one private writer credential before any network request', async t => {
  const cases = [
    ['missing credentials', { SENSENET_API_KEY: undefined }],
    ['both credentials', { SENSENET_ACCESS_TOKEN: 'private-fixture-token' }],
    ['whitespace key', { SENSENET_API_KEY: '  ' }],
    ['key header injection', { SENSENET_API_KEY: 'fixture\r\nInjected: true' }],
    ['token header injection', { SENSENET_API_KEY: undefined, SENSENET_ACCESS_TOKEN: 'fixture\nInjected: true' }],
    ['frontend API key is not a writer credential', { SENSENET_API_KEY: undefined, REACT_APP_SENSENET_API_KEY: 'public-fixture-key' }],
    ['frontend token is not a writer credential', { SENSENET_API_KEY: undefined, REACT_APP_SENSENET_ACCESS_TOKEN: 'public-fixture-token' }],
  ];
  for (const [name, values] of cases) {
    await t.test(name, async () => {
      const api = fixture();
      await assert.rejects(updateRepositorySitemap({ ...ENV, ...values }, api.fetchImpl), /exactly one private/);
      assert.equal(api.state.calls.length, 0);
    });
  }
});

test('upload requires an explicit raw site-relative XML target before reading metadata', async t => {
  for (const path of [undefined, '', '/../other.xml', '//outside.example/file.xml', '/%2e%2e/other.xml', '/file.json']) {
    await t.test(String(path), async () => {
      const api = fixture();
      await assert.rejects(updateRepositorySitemap({ ...ENV, REACT_APP_SITEMAP_PATH: path }, api.fetchImpl));
      assert.equal(api.state.calls.length, 0);
    });
  }
});

test('existing File preflight requires Open,Save and uploads one complete overwrite before anonymous verification', async () => {
  const api = fixture();
  const result = await updateRepositorySitemap(ENV, api.fetchImpl);
  assert.deepEqual(result, { updated: true, urls: 2, bytes: Buffer.byteLength(EXPECTED_XML, 'utf8') });
  assert.deepEqual(api.state.calls.map(({ kind }) => kind), [
    'target', 'permission', 'public', 'source', 'source', 'source', 'source', 'upload', 'public',
  ]);
  const permission = api.state.calls.find(({ kind }) => kind === 'permission');
  assert.equal(decodeURIComponent(permission.url.pathname), `${TARGET_ITEM}/HasPermission`);
  assert.equal(permission.url.searchParams.get('permissions'), 'Open,Save');
  const upload = api.state.uploads[0];
  assert.equal(decodeURIComponent(upload.url.pathname), `${PARENT_ITEM}/Upload`);
  assert.equal(upload.request.method, 'POST');
  assert.equal(upload.headers.has('content-type'), false, 'fetch must set the multipart boundary');
  const form = upload.request.body;
  assert.equal(form instanceof FormData, true);
  const expectedFields = {
    ChunkToken: '0*0*False*False', FileName: 'sitemap.xml', Overwrite: 'true', PropertyName: 'Binary',
    FileLength: String(Buffer.byteLength(EXPECTED_XML, 'utf8')), ContentType: 'File', UseChunk: 'false',
  };
  assert.deepEqual([...form.keys()].sort(), [...Object.keys(expectedFields), 'sitemap.xml'].sort());
  for (const [name, value] of Object.entries(expectedFields)) assert.equal(form.get(name), value, name);
  const file = form.get('sitemap.xml');
  assert.equal(file.name, 'sitemap.xml');
  assert.equal(file.type, 'application/xml');
  assert.equal(file.size, Buffer.byteLength(EXPECTED_XML, 'utf8'));
  assert.equal(await file.text(), EXPECTED_XML);
  assert.equal(api.state.publicXml, EXPECTED_XML);
  assertSafeTransport(api);
});

test('new target checks its existing parent and Open,AddNew before creating the exact file', async () => {
  const api = fixture({ exists: false });
  const result = await updateRepositorySitemap(ENV, api.fetchImpl);
  assert.equal(result.updated, true);
  assert.deepEqual(api.state.calls.slice(0, 3).map(({ kind }) => kind), ['target', 'parent', 'permission']);
  const permission = api.state.calls.find(({ kind }) => kind === 'permission');
  assert.equal(decodeURIComponent(permission.url.pathname), `${PARENT_ITEM}/HasPermission`);
  assert.equal(permission.url.searchParams.get('permissions'), 'Open,AddNew');
  assert.equal(api.state.publicReads, 1, 'only read the new file after upload');
  assert.equal(api.state.uploads.length, 1);
  assertSafeTransport(api);
});

test('repository upload contains eligible navigation and published folder details without hidden, future or link records', async () => {
  const rows = [
    ...ROWS,
    { Id: 3, Path: `${ROOT}/published-detail`, Type: 'LeisureArticle', IsFolder: true, Hidden: false,
      DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z', ModificationDate: '2025-02-03T04:05:06Z' },
    { Id: 4, Path: `${ROOT}/test-folder`, Type: 'Folder', IsFolder: true, Hidden: false, DisplayZone: [] },
    { Id: 5, Path: `${ROOT}/future`, Type: 'LeisureArticle', IsFolder: true, Hidden: false,
      DisplayZone: ['menuitem'], PublishDate: '2099-01-01T00:00:00Z' },
    { Id: 6, Path: `${ROOT}/hidden`, Type: 'Article', Hidden: '1', DisplayZone: ['menuitem'] },
    { Id: 7, Path: `${ROOT}/external`, Type: 'SoftLink', Hidden: false, DisplayZone: ['menuitem'],
      PublishDate: '2025-01-01T00:00:00Z', Url: 'https://external.example/page' },
    { Id: 8, Path: `${ROOT}/unset-publication-iso`, Type: 'Article', Hidden: false, DisplayZone: [],
      PublishDate: '0001-01-01T00:00:00Z' },
    { Id: 9, Path: `${ROOT}/unset-publication-dotnet`, Type: 'Article', Hidden: false, DisplayZone: [],
      PublishDate: '/Date(-62135596800000)/' },
  ];
  const api = fixture({ sourcePages: [{ d: { results: rows, __count: String(rows.length) } }, { d: { results: [] } }] });
  const result = await updateRepositorySitemap(ENV, api.fetchImpl);
  assert.equal(result.updated, true);
  assert.equal(result.urls, 3);
  assert.equal(api.state.uploads.length, 1);
  const xml = await api.state.uploads[0].request.body.get('sitemap.xml').text();
  assert.equal(xml, EXPECTED_XML.replace('</urlset>',
    '  <url><loc>https://magazine.example/published-detail</loc><lastmod>2025-02-03T04:05:06.000Z</lastmod></url>\n</urlset>'));
  assert.doesNotMatch(xml, /test-folder|\/future|\/hidden|\/external|unset-publication/);
  assert.equal(api.state.publicXml, xml);
  assertSafeTransport(api);
});

test('accepts a private access token while source collection and public reads remain anonymous', async () => {
  const api = fixture();
  await updateRepositorySitemap({ ...ENV, SENSENET_API_KEY: undefined, SENSENET_ACCESS_TOKEN: 'private-fixture-token' }, api.fetchImpl);
  assertSafeTransport(api, { token: true });
});

test('repository upload excludes published descendants of hidden technical ancestors found only in the second inventory', async () => {
  const api = fixture({
    rows: [...ROWS, { Id: 3, Path: `${ROOT}/private/published`, Type: 'Article', Hidden: false,
      DisplayZone: [], PublishDate: '2025-01-01T00:00:00Z' }],
    hiddenRows: [{ Id: 4, Path: `${ROOT}/private`, Type: 'SystemFolder', Hidden: true, IsFolder: true }],
  });
  const result = await updateRepositorySitemap(ENV, api.fetchImpl);
  assert.equal(result.urls, 2);
  assert.equal(api.state.publicXml, EXPECTED_XML);
  assertSafeTransport(api);
});

test('accepts wrapped true for HasPermission compatibility', async () => {
  const api = fixture({ oldXml: EXPECTED_XML, overrides: { permission: Response.json({ d: true }) } });
  assert.equal((await updateRepositorySitemap(ENV, api.fetchImpl)).updated, false);
  assertNoWrites(api);
});

test('permission denial or malformed permission responses never trigger generation or writes', async t => {
  const cases = [
    ['bare false', Response.json(false)],
    ['wrapped false', Response.json({ d: false })],
    ['truthy string', Response.json('true')],
    ['unexpected JSON', Response.json({ allowed: true })],
    ['HTTP forbidden', new Response('forbidden', { status: 403 })],
  ];
  for (const exists of [true, false]) {
    for (const [name, response] of cases) {
      await t.test(`${exists ? 'existing File' : 'new File'}: ${name}`, async () => {
        const api = fixture({ exists, overrides: { permission: response } });
        await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl), /requires Open,(Save|AddNew) permission/);
        assertNoWrites(api);
        assert.equal(api.state.sourceReads, 0);
        assert.equal(api.state.publicReads, 0);
      });
    }
  }
});

test('existing target must be an unlocked pure File, with exact metadata path boundary', async t => {
  const cases = [
    ['locked File', { Locked: true }],
    ['folder', { IsFolder: true }],
    ['derived Image', { Type: 'Image' }],
    ['Article', { Type: 'Article' }],
    ['Widget', { Type: 'Widget' }],
    ['sibling site', { Path: '/Root/Content/MagazineSibling/SEO/sitemap.xml' }],
    ['another filename', { Path: `${PARENT}/other.xml` }],
    ['wrong path casing', { Path: '/Root/Content/magazine/SEO/sitemap.xml' }],
  ];
  for (const [name, target] of cases) {
    await t.test(name, async () => {
      const api = fixture({ target });
      await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl), /unlocked File|Invalid sitemap target metadata/);
      assertNoWrites(api);
      assert.deepEqual(api.state.calls.map(({ kind }) => kind), ['target']);
    });
  }
});

test('metadata errors and missing or mismatched creation parents cause no writes', async t => {
  const cases = [
    ['target HTTP failure', true, { target: new Response('failed', { status: 500 }) }],
    ['target malformed JSON', true, { target: new Response('{broken') }],
    ['target wrong envelope', true, { target: Response.json(TARGET_METADATA) }],
    ['target missing type', true, { target: Response.json({ d: { Path: TARGET } }) }],
    ['missing parent', false, { parent: new Response('missing', { status: 404 }) }],
    ['parent is a File', false, { parent: Response.json({ d: { ...PARENT_METADATA, Type: 'File', IsFolder: false } }) }],
    ['parent is another site', false, { parent: Response.json({ d: { ...PARENT_METADATA, Path: '/Root/Content/MagazineSibling/SEO' } }) }],
  ];
  for (const [name, exists, overrides] of cases) {
    await t.test(name, async () => {
      const api = fixture({ exists, overrides });
      await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl));
      assertNoWrites(api);
      assert.equal(api.state.sourceReads, 0);
    });
  }
});

test('an existing old file must already be anonymously readable as XML before generation or upload', async t => {
  const cases = [
    ['private file', () => xmlResponse('denied', 'application/xml', 403)],
    ['unpublished file', () => xmlResponse('missing', 'application/xml', 404)],
    ['HTML response', () => xmlResponse('<html>login</html>', 'text/html')],
    ['missing XML MIME', () => xmlResponse(OLD_XML, null)],
    ['malformed XML MIME suffix', () => xmlResponse(OLD_XML, 'application/xml-invalid')],
  ];
  for (const [name, publicResponse] of cases) {
    await t.test(name, async () => {
      const api = fixture({ overrides: { public: publicResponse } });
      await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl), /publicly readable|XML Content-Type/);
      assertNoWrites(api);
      assert.equal(api.state.sourceReads, 0);
    });
  }
});

test('generation failures never replace the existing public file or submit a multipart request', async t => {
  const firstPage = { d: { results: [ROWS[0]], __count: '2' } };
  const cases = [
    ['initial network failure', [new Error('fixture generation failure')]],
    ['empty source', [{ d: { results: [] } }]],
    ['malformed source JSON', [new Response('{broken')]],
    ['later network failure', [firstPage, new Error('fixture later failure')]],
    ['later HTTP failure', [firstPage, new Response('failed', { status: 500 })]],
    ['repeating source page', [firstPage, firstPage]],
    ['incomplete source', [firstPage, { d: { results: [], __count: '2' } }]],
    ['hidden inventory failure', [{ d: { results: ROWS, __count: '2' } }, { d: { results: [] } }, new Error('hidden inventory unavailable')]],
  ];
  for (const [name, sourcePages] of cases) {
    await t.test(name, async () => {
      const api = fixture({ sourcePages });
      await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl));
      assertNoWrites(api);
      assert.equal(api.state.publicXml, OLD_XML);
    });
  }
});

test('skips an unchanged public sitemap after full anonymous generation', async () => {
  const api = fixture({ oldXml: EXPECTED_XML });
  assert.deepEqual(await updateRepositorySitemap(ENV, api.fetchImpl), {
    updated: false, urls: 2, bytes: Buffer.byteLength(EXPECTED_XML, 'utf8'),
  });
  assertNoWrites(api);
  assert.equal(api.state.sourceReads, 4);
  assert.equal(api.state.publicReads, 1);
  assertSafeTransport(api);
});

test('anonymous readback rejects drafts, stale XML and non-XML or malformed XML MIME after upload', async t => {
  const cases = [
    ['draft/private version', () => xmlResponse('denied', 'application/xml', 403)],
    ['stale public version', () => xmlResponse(OLD_XML)],
    ['HTML public version', () => xmlResponse(EXPECTED_XML, 'text/html')],
    ['malformed XML MIME suffix', () => xmlResponse(EXPECTED_XML, 'text/xml-invalid')],
  ];
  for (const [name, readback] of cases) {
    await t.test(name, async () => {
      const api = fixture({ overrides: { public: (_call, state) => state.publicReads === 1 ? xmlResponse(OLD_XML) : readback() } });
      await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl), /publicly readable|public version|XML Content-Type/);
      assert.equal(api.state.uploads.length, 1);
      assert.equal(api.state.publicReads, 2);
      assertSafeTransport(api);
    });
  }
});

test('failed upload does not claim success or try to verify a successful public version', async () => {
  const api = fixture({ overrides: { upload: new Response('fixture failed', { status: 500 }) } });
  await assert.rejects(updateRepositorySitemap(ENV, api.fetchImpl), /upload failed \(HTTP 500\)/);
  assert.equal(api.state.uploads.length, 1);
  assert.equal(api.state.publicReads, 1);
  assert.equal(api.state.publicXml, OLD_XML);
});

test('real HTTP transport sends a complete UTF-8 multipart overwrite, verifies it anonymously and skips the second upload', async t => {
  const fileName = 'árvíz & report.xml';
  const publicPath = `${PARENT}/${fileName}`;
  const targetItem = `/OData.svc${PARENT}('${fileName}')`;
  const calls = [];
  let publicXml = OLD_XML;
  let uploadCount = 0;
  let receivedForm;
  let serverError;
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const path = decodeURIComponent(url.pathname);
      calls.push({ path, headers: request.headers, method: request.method });
      const sendJson = body => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); };
      if (path === targetItem) return sendJson({ d: { ...TARGET_METADATA, Path: publicPath } });
      if (path === `${targetItem}/HasPermission`) {
        assert.equal(url.searchParams.get('permissions'), 'Open,Save');
        return sendJson(true);
      }
      if (path === '/OData.svc/Root/Content') {
        const skip = Number(/\.SKIP:(\d+)/.exec(url.searchParams.get('query'))[1]);
        const rows = url.searchParams.get('query').includes('+Hidden:1') ? [] : ROWS;
        return sendJson({ d: { results: rows.slice(skip, skip + 1), __count: String(rows.length) } });
      }
      if (path === `${PARENT_ITEM}/Upload`) {
        assert.equal(request.method, 'POST');
        assert.match(request.headers['content-type'], /^multipart\/form-data; boundary=/);
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        receivedForm = await new Request(url, { method: 'POST', headers: request.headers, body: Buffer.concat(chunks) }).formData();
        const file = receivedForm.get(fileName);
        assert.equal(file.name, fileName);
        assert.equal(file.type, 'application/xml');
        assert.equal(file.size, Buffer.byteLength(EXPECTED_XML, 'utf8'));
        assert.equal(receivedForm.get('FileName'), fileName);
        assert.equal(receivedForm.get('FileLength'), String(file.size));
        assert.equal(receivedForm.get('Overwrite'), 'true');
        publicXml = await file.text();
        uploadCount++;
        return sendJson({ uploaded: true });
      }
      if (path === publicPath) {
        response.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        return response.end(publicXml);
      }
      throw new Error(`Unexpected HTTP fixture path: ${path}`);
    } catch (error) {
      serverError = error;
      response.writeHead(500);
      response.end('fixture error');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const env = { ...ENV, REACT_APP_API_URL: `http://127.0.0.1:${server.address().port}`, REACT_APP_SITEMAP_PATH: `/SEO/${fileName}` };
  assert.deepEqual(await updateRepositorySitemap(env), { updated: true, urls: 2, bytes: Buffer.byteLength(EXPECTED_XML) });
  assert.deepEqual(await updateRepositorySitemap(env), { updated: false, urls: 2, bytes: Buffer.byteLength(EXPECTED_XML) });
  assert.equal(serverError, undefined);
  assert.equal(uploadCount, 1);
  assert.equal(publicXml, EXPECTED_XML);
  assert.equal(receivedForm.get('PropertyName'), 'Binary');
  for (const { path, headers } of calls) {
    assert.equal(headers.cookie, undefined);
    assert.equal(headers.authorization, undefined);
    assert.equal(headers.apikey, path === publicPath || path === '/OData.svc/Root/Content' ? undefined : ENV.SENSENET_API_KEY);
  }
});

test('real HTTP metadata redirects are rejected before credentials can reach another endpoint', async t => {
  const calls = [];
  const server = createServer((request, response) => {
    calls.push({ path: request.url, method: request.method });
    if (request.url === '/redirect-sink') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ d: TARGET_METADATA }));
    }
    response.writeHead(302, { Location: '/redirect-sink' });
    response.end();
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await assert.rejects(updateRepositorySitemap({ ...ENV, REACT_APP_API_URL: `http://127.0.0.1:${server.address().port}` }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls.some(({ path }) => path === '/redirect-sink'), false);
});
