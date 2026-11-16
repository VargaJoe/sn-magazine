import { loadEditorialData } from './editorial-loader';

const root = '/Root/Content/Magazine';
const editorialRoot = `${root}/(editorial)`;
const now = Date.parse('2026-06-01T12:00:00Z');
const item = (Id, fields = {}) => ({ Id, Type: 'EditorialItem', Path: `${editorialRoot}/Items/i-${Id}`,
  DisplayName: `Item ${Id}`, IsListed: true, MediaKind: ['book'], ItemScope: ['edition'], ...fields });
const collection = (Id, fields = {}) => ({ Id, Type: 'EditorialCollection', Path: `${editorialRoot}/Collections/c-${Id}`,
  DisplayName: `Collection ${Id}`, IsListed: true, OrderMode: ['manual'], ...fields });
const review = (Id, fields = {}) => ({ Id, Type: 'LeisureBookReview', Path: `${root}/Reviews/r-${Id}`,
  DisplayName: `Review ${Id}`, PublishDate: '2025-02-01T12:00:00Z', ...fields });
const membership = (Id, Item, Collection, fields = {}) => ({ Id, Type: 'EditorialMembership',
  Path: `${editorialRoot}/Memberships/m-${Id}`, Item, Collection, Position: 1, ...fields });
const annotation = (Id, Target, Items = [], fields = {}) => ({ Id, Type: 'EditorialAnnotation',
  Path: `${root}/(structure)/Editorial/a-${Id}`, Target, Items, ...fields });
const page = (results, extra = {}) => ({ d: { results, ...extra } });
const refs = value => Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : value ? [value] : [];
const queryIds = (query, field) => new RegExp(`\\+${field}:\\(([\\d ]+)\\)`).exec(query)?.[1].split(' ').map(Number) || [];
const requestType = request => /\+Type:(\w+)/.exec(request.oDataOptions.query)?.[1];
const empty = () => ({ EditorialItem: [], EditorialCollection: [], EditorialMembership: [], EditorialAnnotation: [] });
const options = fields => ({ root, editorialRoot, articles: [], categories: [], ...fields });
function repository(data = empty(), { maxPageSize = 200, count } = {}) {
  return { loadCollection: jest.fn(request => {
    const { query, skip, top } = request.oDataOptions;
    let values = data[requestType(request)] || [];
    ['Item', 'Collection', 'Target'].forEach(field => {
      const allowed = queryIds(query, field);
      if (allowed.length) values = values.filter(node => refs(node[field]).some(ref => allowed.includes(Number(ref.Id))));
    });
    return Promise.resolve(page(values.slice().sort((a, b) => a.Id - b.Id).slice(skip, skip + Math.min(top, maxPageSize)),
      count === undefined ? {} : { __count: String(count) }));
  }) };
}
const callsFor = (repo, type) => repo.loadCollection.mock.calls.map(([request]) => request).filter(request => requestType(request) === type);
const fixture = () => {
  const first = item(1); const group = collection(100); const article = review(10);
  return { first, group, article, data: { EditorialItem: [first], EditorialCollection: [group],
    EditorialMembership: [membership(200, first, group)], EditorialAnnotation: [annotation(300, article, first)] } };
};

beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

test.each(['string', 'object', 'array', 'results'])('loads an explicit %s editorial root with scoped typed queries and safe native projections', async shape => {
  const { first, group, article, data } = fixture();
  data.EditorialItem[0].PrivateNote = 'never returned';
  data.EditorialAnnotation[0].PrivateNote = 'never returned';
  data.EditorialAnnotation[0].Featured = true;
  const folder = { Id: 999, Type: 'Folder', Path: editorialRoot };
  const configured = shape === 'string' ? editorialRoot : shape === 'object' ? folder : shape === 'array' ? [folder] : { results: [folder] };
  const repo = repository(data);
  const result = await loadEditorialData(repo, options({ editorialRoot: configured, articles: [article], ContentQuery: '+Type:GenericContent' }));
  expect(result.items[0]).toMatchObject({ Id: first.Id, IsListed: true, MediaKind: ['book'] });
  expect(result.collections[0].Id).toBe(group.Id);
  expect(result.memberships[0].Item).toEqual([{ Id: first.Id, Path: first.Path, Type: first.Type, IsListed: true }]);
  expect(result.annotations[0]).toMatchObject({ Featured: true, Target: [{ Id: article.Id, Path: article.Path, Type: article.Type, PublishDate: article.PublishDate }] });
  expect(JSON.stringify(result)).not.toContain('PrivateNote');
  const itemRequest = callsFor(repo, 'EditorialItem')[0];
  expect(itemRequest.path).toBe(editorialRoot);
  expect(itemRequest.oDataOptions.query).toBe(`+InTree:${JSON.stringify(editorialRoot)} +Type:EditorialItem +IsListed:true`);
  expect(itemRequest.oDataOptions).toMatchObject({ top: 200, skip: 0, orderby: [['Id', 'asc']],
    expand: ['ParentItem'], enableautofilters: 'on', enablelifespanfilter: 'on', metadata: 'no' });
  expect(itemRequest.oDataOptions.select).toEqual(expect.arrayContaining(['Id', 'PublisherLabel', 'ParentItem/Id', 'ParentItem/IsListed']));
  expect(itemRequest.oDataOptions.select).not.toContain('PrivateNote');
  expect(callsFor(repo, 'EditorialMembership')[0].oDataOptions.query).toContain('+Item:(1) +Collection:(100)');
  expect(callsFor(repo, 'EditorialAnnotation')[0]).toMatchObject({ path: root, oDataOptions: {
    query: `+InTree:${JSON.stringify(root)} +Type:EditorialAnnotation +Target:(10)`, expand: ['Target', 'Items'] } });
});

test('does not query memberships without both canonical listed endpoint sets, or annotations without visible targets', async () => {
  for (const data of [empty(), { ...empty(), EditorialItem: [item(1)] }, { ...empty(), EditorialCollection: [collection(100)] }]) {
    const repo = repository(data);
    const result = await loadEditorialData(repo, options());
    expect(result.memberships).toEqual([]);
    expect(result.annotations).toEqual([]);
    expect(callsFor(repo, 'EditorialMembership')).toEqual([]);
    expect(callsFor(repo, 'EditorialAnnotation')).toEqual([]);
  }
});

test('reads all stable pages and verifies the final empty page without trusting security-sensitive __count', async () => {
  const entries = Array.from({ length: 405 }, (_, index) => item(index + 1));
  const repo = repository({ ...empty(), EditorialItem: entries }, { count: 900000 });
  const result = await loadEditorialData(repo, options());
  expect(result.items).toHaveLength(405);
  expect(callsFor(repo, 'EditorialItem').map(request => request.oDataOptions.skip)).toEqual([0, 200, 400, 405]);
  expect(result).not.toHaveProperty('__count');
});

test('supports server-enforced shorter pages by advancing by actual returned rows', async () => {
  const entries = Array.from({ length: 7 }, (_, index) => item(index + 1));
  const repo = repository({ ...empty(), EditorialItem: entries }, { maxPageSize: 3, count: 7 });
  expect((await loadEditorialData(repo, options())).items).toHaveLength(7);
  expect(callsFor(repo, 'EditorialItem').map(request => request.oDataOptions.skip)).toEqual([0, 3, 6, 7]);
});

test('chunks both membership endpoints and annotation targets into bounded 100-ID queries, then deduplicates the combined sets', async () => {
  const entries = Array.from({ length: 101 }, (_, index) => item(index + 1));
  const groups = Array.from({ length: 101 }, (_, index) => collection(index + 1000));
  const articles = Array.from({ length: 200 }, (_, index) => review(index + 10000));
  const category = { Id: 99000, Type: 'LeisureCategory', Path: `${root}/Books` };
  const repo = repository({ EditorialItem: entries, EditorialCollection: groups,
    EditorialMembership: [membership(20000, entries[0], groups[0]), membership(20001, entries[100], groups[100])],
    EditorialAnnotation: [annotation(30000, articles[0], entries[0]), annotation(30001, category, [])] });
  const result = await loadEditorialData(repo, options({ articles, categories: [category] }));
  expect(result.memberships).toHaveLength(2);
  expect(result.annotations).toHaveLength(2);
  const memberQueries = [...new Set(callsFor(repo, 'EditorialMembership').map(request => request.oDataOptions.query))];
  expect(memberQueries).toHaveLength(4);
  memberQueries.forEach(query => {
    expect(queryIds(query, 'Item').length).toBeLessThanOrEqual(100);
    expect(queryIds(query, 'Collection').length).toBeLessThanOrEqual(100);
  });
  const annotationQueries = [...new Set(callsFor(repo, 'EditorialAnnotation').map(request => request.oDataOptions.query))];
  expect(annotationQueries).toHaveLength(3);
  expect(annotationQueries.flatMap(query => queryIds(query, 'Target'))).toEqual([...articles.map(article => article.Id), category.Id]);
});

test('annotation queries contain only rechecked published stories and visible in-site categories', async () => {
  const article = review(10);
  const categories = [{ Id: 20, Type: 'LeisureCategory', Path: `${root}/Books` },
    { Id: 21, Type: 'LeisureCategory', Path: `${root}/Hidden`, Hidden: true },
    { Id: 22, Type: 'LeisureCategory', Path: '/Root/Other/Category' },
    { Id: 23, Type: 'LeisureCategory', Path: `${root}/(private)/Category` },
    { Id: 24, Type: 'Folder', Path: `${root}/Folder` }];
  const repo = repository();
  await loadEditorialData(repo, options({ articles: [article, article, review(11, { Hidden: true }),
    review(12, { PublishDate: '2027-01-01T00:00:00Z' }), review(13, { Path: '/Root/Other/review' }),
    review(14, { Type: 'EditorialItem' })], categories }));
  expect(queryIds(callsFor(repo, 'EditorialAnnotation')[0].oDataOptions.query, 'Target')).toEqual([10, 20]);
});

test('conflicting category and review identities cannot silently replace a canonical annotation target', async () => {
  const repo = repository();
  await expect(loadEditorialData(repo, options({ articles: [review(10)],
    categories: [{ Id: 10, Type: 'LeisureCategory', Path: `${root}/Books` }] }))).rejects.toThrow('Conflicting editorial target');
  expect(callsFor(repo, 'EditorialAnnotation')).toEqual([]);
});

test('keeps start-here annotations for canonical public query pages and category landing pages', async () => {
  const landing = { Id: 20, Type: 'LeisureCategory', Path: `${root}/Collections` };
  const hub = { Id: 21, Type: 'SmartFolder', Path: `${root}/Collections/World` };
  const hidden = { ...hub, Id: 22, Path: `${root}/Collections/Hidden`, Hidden: true };
  const future = { Id: 23, Type: 'Page', Path: `${root}/Future`, PublishDate: '2027-01-01T00:00:00Z' };
  const technical = { ...hub, Id: 24, Path: `${root}/(structure)/Query` };
  const repo = repository({ ...empty(), EditorialAnnotation: [
    annotation(300, landing, [], { StartHere: true, Description: 'Category introduction' }),
    annotation(301, hub, [], { StartHere: true, Description: 'World introduction' }),
  ] });
  const result = await loadEditorialData(repo, options({ categories: [landing], pages: [hub, hidden, future, technical] }));
  expect(result.annotations.map(node => node.Description)).toEqual(['Category introduction', 'World introduction']);
  expect(queryIds(callsFor(repo, 'EditorialAnnotation')[0].oDataOptions.query, 'Target')).toEqual([20, 21]);
});

test.each(['review', 'category'])('rejects duplicate annotations for the same canonical %s target', async kind => {
  const target = kind === 'review' ? review(10) : { Id: 10, Type: 'LeisureCategory', Path: `${root}/Books` };
  const repo = repository({ ...empty(), EditorialAnnotation: [annotation(300, target), annotation(301, target)] });
  await expect(loadEditorialData(repo, options({ articles: kind === 'review' ? [target] : [],
    categories: kind === 'category' ? [target] : [] }))).rejects.toThrow('Duplicate editorial annotation');
});

test('rejects malformed and advertised-but-empty continuation pages', async () => {
  const malformed = { loadCollection: jest.fn().mockResolvedValue({ d: {} }) };
  await expect(loadEditorialData(malformed, options())).rejects.toThrow('Incomplete editorial page');
  const incomplete = { loadCollection: jest.fn().mockResolvedValue(page([], { __next: '/untrusted/continuation' })) };
  await expect(loadEditorialData(incomplete, options())).rejects.toThrow('Incomplete editorial continuation');
});

test('rejects duplicate IDs or paths and unstable order across pages rather than silently losing records', async () => {
  for (const duplicate of [item(2000), item(2200, { Path: item(2000).Path }), item(1999)]) {
    const first = Array.from({ length: 200 }, (_, index) => item(index + 2000));
    const repo = { loadCollection: jest.fn(request => {
      if (requestType(request) !== 'EditorialItem') return Promise.resolve(page([]));
      return Promise.resolve(page(request.oDataOptions.skip ? [duplicate] : first));
    }) };
    await expect(loadEditorialData(repo, options())).rejects.toThrow('Invalid editorial page');
  }
});

test.each([
  item(1, { Path: `${root}/(other)/item` }), item(1, { Path: `${editorialRoot}/(private)/item` }),
  item(1, { Hidden: true }), item(1, { IsListed: false }), item(1, { Type: 'MediaItem' }),
  item(1, { Id: undefined }), item(1, { Path: `${root}-other/(editorial)/item` }),
])('rejects a server response that violates the typed listed metadata scope %#', async node => {
  const repo = repository({ ...empty(), EditorialItem: [node] });
  await expect(loadEditorialData(repo, options())).rejects.toThrow('Invalid editorial page');
});

test('accepts exactly 5000 records but rejects a 5001st record instead of returning a partial set', async () => {
  const entries = Array.from({ length: 5001 }, (_, index) => item(index + 1));
  const allowed = repository({ ...empty(), EditorialItem: entries.slice(0, 5000) });
  await expect(loadEditorialData(allowed, options())).resolves.toMatchObject({ items: expect.any(Array) });
  expect(callsFor(allowed, 'EditorialItem').at(-1).oDataOptions.skip).toBe(5000);
  const exceeded = repository({ ...empty(), EditorialItem: entries });
  await expect(loadEditorialData(exceeded, options())).rejects.toThrow('Editorial catalogue limit reached');
});

test.each(['hidden', 'foreign', 'deferred', 'unknown'])('requires membership endpoints to resolve to canonical listed nodes (%s)', async kind => {
  const { first, group, data } = fixture();
  const bad = kind === 'hidden' ? { ...first, Hidden: true } : kind === 'foreign' ? { ...first, Path: '/Root/Other/item' } :
    kind === 'deferred' ? { Id: first.Id, __deferred: { uri: first.Path } } : { Id: 999 };
  data.EditorialMembership = [membership(200, bad, group)];
  const repo = repository(data);
  // Preserve the bad response even when it violates the request's endpoint ID filter.
  const original = repo.loadCollection.getMockImplementation();
  repo.loadCollection.mockImplementation(request => requestType(request) === 'EditorialMembership' ?
    Promise.resolve(page(request.oDataOptions.skip ? [] : data.EditorialMembership)) : original(request));
  await expect(loadEditorialData(repo, options())).rejects.toThrow('Incomplete editorial membership');
});

test('annotation targets must resolve to canonical public inputs, while unlisted or foreign Items references are omitted', async () => {
  const { first, article, data } = fixture();
  data.EditorialAnnotation[0].Items = [first, { Id: 999, DisplayName: 'Private item' }, { ...first, Path: '/Root/Other/item' }];
  const repo = repository(data);
  const result = await loadEditorialData(repo, options({ articles: [article] }));
  expect(result.annotations[0].Items).toHaveLength(1);
  data.EditorialAnnotation[0].Target = { ...article, Hidden: true };
  await expect(loadEditorialData(repository(data), options({ articles: [article] }))).rejects.toThrow('Incomplete editorial annotation');
});

test('aborting an ignored transport prevents later paging and discards the pending result', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const repo = { loadCollection: jest.fn(request => requestType(request) === 'EditorialItem' ? pending : Promise.resolve(page([]))) };
  const controller = new AbortController();
  const loading = loadEditorialData(repo, options(), controller.signal);
  const rejected = loading.catch(error => error);
  controller.abort();
  await expect(rejected).resolves.toMatchObject({ name: 'AbortError' });
  expect(repo.loadCollection.mock.calls[0][0].requestInit.signal.aborted).toBe(true);
  resolve(page(Array.from({ length: 200 }, (_, index) => item(index + 1))));
  await Promise.resolve();
  expect(callsFor(repo, 'EditorialItem')).toHaveLength(1);
  const preAborted = repository();
  await expect(loadEditorialData(preAborted, options(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(preAborted.loadCollection).not.toHaveBeenCalled();
});

test.each([root, '/Root/Other/(editorial)', `${root}/nested/(editorial)`, `${root}/../(editorial)`,
  { Path: editorialRoot, Type: 'EditorialItem' }, { Path: editorialRoot, Type: 'Folder', Hidden: true },
  { __deferred: { uri: editorialRoot } }, [{ Path: editorialRoot }, { Path: editorialRoot }], null,
])('rejects invalid or ambiguous editorial configuration before any request %#', async configured => {
  const repo = repository();
  await expect(loadEditorialData(repo, options({ editorialRoot: configured }))).rejects.toThrow('Invalid editorial root');
  expect(repo.loadCollection).not.toHaveBeenCalled();
});
