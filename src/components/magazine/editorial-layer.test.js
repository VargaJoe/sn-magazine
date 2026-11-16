import { createEditorialLayer, positivePosition } from './editorial-layer';

const root = '/Root/Content/Magazine';
const editorialRoot = `${root}/Editorial`;
const now = Date.parse('2026-06-01T12:00:00Z');
const item = (Id, fields = {}) => ({ Id, Type: 'EditorialItem', Path: `${editorialRoot}/Items/i-${Id}`,
  DisplayName: `Item ${Id}`, IsListed: true, MediaKind: ['book'], ItemScope: ['edition'], ...fields });
const collection = (Id, fields = {}) => ({ Id, Type: 'EditorialCollection', Path: `${editorialRoot}/Collections/c-${Id}`,
  DisplayName: `Collection ${Id}`, IsListed: true, OrderMode: ['manual'], ...fields });
const review = (Id, fields = {}) => ({ Id, Type: 'LeisureBookReview', Path: `${root}/Reviews/r-${Id}`,
  DisplayName: `Review ${Id}`, PublishDate: '2025-02-01T12:00:00Z', ...fields });
const membership = (Id, Item, Collection, Position, fields = {}) => ({ Id, Type: 'EditorialMembership',
  Path: `${editorialRoot}/Memberships/m-${Id}`, Item, Collection, Position, ...fields });
const annotation = (Id, Target, Items, fields = {}) => ({ Id, Type: 'EditorialAnnotation',
  Path: `${editorialRoot}/Annotations/a-${Id}`, Target, Items, ...fields });
const layer = values => createEditorialLayer({ root, editorialRoot, ...values });
const ids = values => values.map(value => value.Id);
const rowIds = values => values.map(value => value.item.Id);

beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

test('hub pool is the identity-deduplicated union of its direct and recursively listed descendant memberships', () => {
  const hub = collection(100);
  const child = collection(101, { ParentCollection: hub });
  const grandchild = collection(102, { ParentCollection: { results: [child] } });
  const privateChild = collection(103, { ParentCollection: hub, IsListed: false });
  const items = [1, 2, 3, 4, 5].map(id => item(id));
  const repeated = membership(201, items[0], hub, 0);
  const model = layer({ items: [...items, { ...items[1], Id: '2' }], collections: [hub, child, grandchild, privateChild],
    memberships: [repeated, repeated, membership(202, items[0], child, 4), membership(203, items[1], child, 2),
      membership(204, items[2], grandchild, 1), membership(205, items[3], privateChild, 1)] });
  const view = model.collectionView(hub);
  expect(model.error).toBeUndefined();
  expect(ids(view.children)).toEqual([101]);
  expect(rowIds(view.rows).sort()).toEqual([1, 2, 3]);
  expect(view.totalItems).toBe(3);
  expect(model.items).toHaveLength(5);
  expect(model.memberships).toHaveLength(4);
});

test('selected child keeps parent-only and sibling members unplaced, and never borrows another order position', () => {
  const hub = collection(100, { OrderMode: 'unordered' });
  const child = collection(101, { ParentCollection: hub });
  const sibling = collection(102, { ParentCollection: hub });
  const first = item(1); const second = item(2); const third = item(3); const ungrouped = item(4);
  const model = layer({ items: [first, second, third, ungrouped], collections: [hub, child, sibling],
    memberships: [membership(201, first, hub, 0), membership(202, second, child, 3), membership(203, third, sibling, 2)] });
  const view = model.collectionView(child.Id, { hub });
  expect(rowIds(view.placed)).toEqual([2]);
  expect(rowIds(view.unplaced)).toEqual([1, 3]);
  expect(view.unplaced.every(row => row.position === null && row.membership === null)).toBe(true);
  expect(view.totalItems).toBe(3);
  expect(model.collectionView(child.Id).totalItems).toBe(1);
});

test('future, hidden, technical, wrong-type and foreign reviews never reach links, counts or placeholder state', () => {
  const entry = item(1); const group = collection(100);
  const good = review(10);
  const bad = [review(11, { Hidden: true }), review(12, { PublishDate: '2027-01-01T00:00:00Z' }),
    review(13, { Path: '/Root/Content/Other/review' }), review(14, { Type: 'Page' }),
    review(15, { Path: `${root}/%28private%29/review` }), review(16, { PublishDate: '2025-02-31' })];
  const model = layer({ items: [entry], collections: [group], memberships: [membership(200, entry, group, 1)],
    articles: [good, ...bad], annotations: [good, ...bad].map((article, index) => annotation(300 + index, article, [entry])) });
  expect(ids(model.collectionView(group).reviews)).toEqual([10]);
  expect(model.collectionView(group).totalReviews).toBe(1);
  expect(ids(model.collectionView(group).rows[0].reviews)).toEqual([10]);
  expect(model.itemViewsForArticle(bad[0])).toEqual([]);
  const withoutPublicReview = layer({ items: [entry], collections: [group], memberships: [membership(200, entry, group, 1)],
    articles: bad, annotations: bad.map((article, index) => annotation(300 + index, article, entry)) });
  const withoutAnyReview = layer({ items: [entry], collections: [group], memberships: [membership(200, entry, group, 1)] });
  expect(withoutPublicReview.collectionView(group)).toEqual(withoutAnyReview.collectionView(group));
});

test('expanded references only identify canonical approved nodes; hidden, foreign, unlisted and deferred references fail closed', () => {
  const first = item(1); const second = item(2, { IsListed: false }); const group = collection(100);
  const article = review(10);
  const badRefs = [{ ...first, Hidden: true }, { ...first, Path: '/Root/Other/item' }, second,
    { __deferred: { uri: first.Path } }, { DisplayName: first.DisplayName }, { Id: 1, Type: 'MediaItem' },
    { Id: 1, Path: `${editorialRoot}/Items/different` }];
  const model = layer({ items: [first, second, item(3, { IsListed: 'true' }), item(4, { Hidden: 'true' }),
    item(5, { Type: 'BookMediaItem' }), item(6, { Path: '/Root/Other/item' })], collections: [group], articles: [article],
    annotations: [annotation(300, article, badRefs)],
    memberships: badRefs.map((ref, index) => membership(200 + index, ref, group, index + 1)) });
  expect(ids(model.items)).toEqual([1]);
  expect(model.memberships).toEqual([]);
  expect(model.itemViewsForArticle(article)).toEqual([]);
  expect(model.collectionView(group).rows).toEqual([]);
});

test.each(['direct', 'array', 'results'])('accepts %s canonical references without copying fields from expansions', shape => {
  const wrap = value => shape === 'direct' ? value : shape === 'array' ? [value] : { results: [value] };
  const entry = item(1, { DisplayName: 'Canonical title' }); const group = collection(100); const article = review(10);
  const model = layer({ items: [entry], collections: [group], articles: [article],
    memberships: [membership(200, wrap({ Id: entry.Id, DisplayName: 'Untrusted title' }), wrap({ Path: group.Path }), 1)],
    annotations: [annotation(300, wrap({ Id: article.Id, DisplayName: 'Untrusted review' }), wrap({ Id: entry.Id }))] });
  expect(model.collectionView(group).rows[0].item.DisplayName).toBe('Canonical title');
  expect(model.collectionView(group).reviews[0].DisplayName).toBe('Review 10');
});

test('duplicate target annotations are an explicit error instead of a first-match override', () => {
  const entry = item(1); const article = review(10);
  const model = layer({ items: [entry], articles: [article], annotations: [annotation(300, article, entry), annotation(301, article, [])] });
  expect(model.error).toBe('duplicate-annotation');
  expect(model.items).toEqual([]);
  expect(model.itemViewsForArticle(article)).toEqual([]);
  expect(model.groupsForArticles([article])).toEqual({ groups: [], ungrouped: [] });
});

test('duplicate active item + collection memberships reject the layer', () => {
  const entry = item(1); const group = collection(100);
  const model = layer({ items: [entry], collections: [group], memberships: [membership(200, entry, group, 1), membership(201, entry, group, 2)] });
  expect(model.error).toBe('duplicate-membership');
  expect(model.collectionView(group).totalItems).toBe(0);
});

test.each(['items', 'collections'])('%s parent cycles are rejected without recursing indefinitely', field => {
  const factory = field === 'items' ? item : collection;
  const parentField = field === 'items' ? 'ParentItem' : 'ParentCollection';
  const first = factory(1); const second = factory(2);
  first[parentField] = second; second[parentField] = { Id: first.Id };
  expect(layer({ [field]: [first, second] }).error).toBe(field === 'items' ? 'item-parent-cycle' : 'collection-parent-cycle');
});

test('multi-item and multi-review counts deduplicate reviews and keep distinct editions', () => {
  const work = item(1, { ItemScope: 'work' });
  const editionA = item(2, { ParentItem: work }); const editionB = item(3);
  const group = collection(100); const first = review(10); const second = review(11);
  const model = layer({ items: [work, editionA, editionB], collections: [group], articles: [first, second],
    memberships: [membership(200, work, group, 1), membership(201, editionA, group, 2), membership(202, editionB, group, 3)],
    annotations: [annotation(300, first, [work, editionA, editionB, editionB]), annotation(301, second, editionA)] });
  const view = model.collectionView(group);
  expect(view.totalItems).toBe(3);
  expect(view.totalReviews).toBe(2);
  expect(view.rows.map(row => row.reviews.length)).toEqual([1, 2, 1]);
  expect(model.itemViewsForArticle(first)).toHaveLength(3);
  expect(model.items.find(node => node.Id === 3).ParentItem).toEqual([]);
});

test('NumberLabel is preserved but never parsed as Position; unknown values remain unplaced', () => {
  const first = item(1); const second = item(2); const group = collection(100);
  const model = layer({ items: [first, second], collections: [group], memberships: [
    membership(200, first, group, null, { NumberLabel: '<b>1/A</b>' }),
    membership(201, second, group, 0, { NumberLabel: '3–4' })] });
  const view = model.collectionView(group);
  expect(view.placed).toEqual([]);
  expect(view.unplaced.map(row => [row.position, row.numberLabel])).toEqual([[null, '1/A'], [null, '3–4']]);
});

test.each([undefined, null, '', ' ', 0, '0', -1, 1.5, true, '1/A', Infinity, '1e3'])('invalid position %p remains unknown', value => {
  expect(positivePosition(value)).toBeNull();
});

test('manual position is numeric and independent of the displayed label', () => {
  const first = item(1); const second = item(2); const group = collection(100);
  const model = layer({ items: [first, second], collections: [group], memberships: [
    membership(200, first, group, '2', { NumberLabel: '1/A' }), membership(201, second, group, 1, { NumberLabel: '9' })] });
  expect(rowIds(model.collectionView(group).rows)).toEqual([2, 1]);
  expect(model.collectionView(group).placed.map(row => row.position)).toEqual([1, 2]);
});

test('unordered collections invent no numbered order or neighbours even when memberships contain positions', () => {
  const first = item(1, { DisplayName: 'Zebra' }); const second = item(2, { DisplayName: 'Alpha' });
  const group = collection(100, { OrderMode: 'unordered' }); const article = review(10);
  const model = layer({ items: [first, second], collections: [group], articles: [article],
    memberships: [membership(200, first, group, 1), membership(201, second, group, 2)], annotations: [annotation(300, article, first)] });
  const view = model.collectionView(group, { sort: 'title' });
  expect(view.placed).toEqual([]);
  expect(rowIds(view.rows)).toEqual([2, 1]);
  expect(view.rows.every(row => row.position === null)).toBe(true);
  expect(model.neighboursForArticle(article, group).next).toBeNull();
});

test('publication projection lists unique review PublishDates independently of position or item release metadata', () => {
  const first = item(1, { PublishDate: '2099-01-01', ReleaseDate: '2029-01-01' }); const second = item(2);
  const group = collection(100); const old = review(10, { PublishDate: '2020-01-01T00:00:00Z' }); const latest = review(11, { PublishDate: '2025-01-01T00:00:00Z' });
  const model = layer({ items: [first, second], collections: [group], articles: [old, latest, latest],
    memberships: [membership(200, first, group, 1), membership(201, second, group, 2)],
    annotations: [annotation(300, old, first), annotation(301, latest, [first, second])] });
  expect(ids(model.collectionView(group, { mode: 'publication' }).reviews)).toEqual([11, 10]);
  expect(ids(model.collectionView(group, { mode: 'publication', sort: 'oldest' }).reviews)).toEqual([10, 11]);
  expect(model.collectionView(group).totalReviews).toBe(2);
});

test('ungrouped articles remain visible; legacy Series and PublisherGroup never infer a collection membership', () => {
  const grouped = item(1); const unassigned = item(2); const group = collection(100);
  const first = review(10); const second = review(11, { Series: group.DisplayName }); const third = review(12);
  const model = layer({ items: [grouped, unassigned], collections: [group], articles: [first, second, third],
    memberships: [membership(200, grouped, group, null)], annotations: [annotation(300, first, grouped),
      annotation(301, second, unassigned, { Series: group.DisplayName, PublisherGroup: group.DisplayName, PublisherSequence: 1 })] });
  const groups = model.groupsForArticles([first, second, third]);
  expect(groups.groups.map(entry => [entry.collection.Id, ids(entry.items)])).toEqual([[100, [10]]]);
  expect(ids(groups.ungrouped)).toEqual([11, 12]);
  expect(model.collectionsForArticle(second)).toEqual([]);
});

test('neighbours keep the immediate known item without silently skipping a missing public review', () => {
  const entries = [1, 2, 3].map(id => item(id)); const group = collection(100);
  const first = review(10); const third = review(12); const hidden = review(11, { Hidden: true });
  const model = layer({ items: entries, collections: [group], articles: [first, hidden, third],
    memberships: entries.map((entry, index) => membership(200 + index, entry, group, index + 1)),
    annotations: [annotation(300, first, entries[0]), annotation(301, hidden, entries[1]), annotation(302, third, entries[2])] });
  const neighbour = model.neighboursForArticle(first, group.Id);
  expect(neighbour.next.item.Id).toBe(2);
  expect(neighbour.next.reviews).toEqual([]);
  expect(neighbour.previous).toBeNull();
  expect(model.neighboursForArticle(third, group.Id).previous.item.Id).toBe(2);
});

test('duplicate positions signal a conflict and disable inferred neighbours rather than pretending the title tie-break is evidence', () => {
  const entries = [1, 2, 3].map(id => item(id)); const group = collection(100); const article = review(10);
  const model = layer({ items: entries, collections: [group], articles: [article],
    memberships: entries.map((entry, index) => membership(200 + index, entry, group, index === 2 ? 2 : 1)),
    annotations: [annotation(300, article, entries[2])] });
  expect(model.collectionView(group).conflicts).toMatchObject([{ type: 'duplicate-position', position: 1 }]);
  expect(model.neighboursForArticle(article, group).previous).toBeNull();
  expect(model.neighboursForArticle(article, group).conflicts).toHaveLength(1);
});

test('automatic neighbours prefer a single leaf order and fail closed for multiple independent orders or multiple reviewed items', () => {
  const hub = collection(100); const child = collection(101, { ParentCollection: hub }); const sibling = collection(102, { ParentCollection: hub });
  const first = item(1); const second = item(2); const article = review(10);
  const base = { items: [first, second], collections: [hub, child, sibling], articles: [article],
    annotations: [annotation(300, article, first)], memberships: [membership(200, first, hub, 1),
      membership(201, first, child, 2), membership(202, second, child, 3)] };
  expect(layer(base).neighboursForArticle(article).collection.Id).toBe(101);
  expect(layer({ ...base, memberships: [...base.memberships, membership(203, first, sibling, 1)] }).neighboursForArticle(article).collection).toBeNull();
  expect(layer({ ...base, annotations: [annotation(300, article, [first, second])] }).neighboursForArticle(article, child).next).toBeNull();
});

test('hub page lookup requires a public same-site explicit identity and does not infer name matches', () => {
  const page = { Id: 10, Type: 'SmartFolder', Path: `${root}/Library`, DisplayName: 'Hub page' };
  const hub = collection(100, { HubPage: { results: [{ Id: page.Id }] }, DisplayName: page.DisplayName });
  const model = layer({ collections: [hub] });
  expect(model.hubForPage(page).Id).toBe(100);
  expect(model.hubForPage({ ...page, Hidden: true })).toBeNull();
  expect(model.hubForPage({ ...page, Path: '/Root/Other/Library' })).toBeNull();
  expect(model.hubForPage({ ...page, Id: 99 })).toBeNull();
  expect(layer({ collections: [collection(100, { DisplayName: page.DisplayName })] }).hubForPage(page)).toBeNull();
  expect(layer({ collections: [collection(100, { HubPage: { ...page, Hidden: true } })] }).hubForPage(page)).toBeNull();
});

test('public presentation snapshots are immutable, preserve useful metadata and leave caller objects mutable', () => {
  const page = { Id: 30, Type: 'Page', Path: `${root}/hub` };
  const entry = item(1, { EditionLabel: '<b>First edition</b>', PublisherLabel: 'Publisher', StudioLabel: 'Studio' });
  const hub = collection(100, { HubPage: page, Kind: ['series'], Description: '<p>Introduction</p>' });
  const child = collection(101, { ParentCollection: hub }); const article = review(10, { Description: 'Lead', Subtitle: 'Subtitle',
    Image: { Url: '/cover.jpg' }, BookAuthor: [{ Id: 40, DisplayName: 'Author' }] });
  const model = layer({ items: [entry], collections: [hub, child], articles: [article],
    memberships: [membership(200, entry, child, 1)], annotations: [annotation(300, article, entry)] });
  const view = model.collectionView(hub);
  expect(Object.isFrozen(model)).toBe(true);
  expect(Object.isFrozen(view.rows[0].reviews[0].Image)).toBe(true);
  expect(Object.isFrozen(article)).toBe(false);
  expect(Object.isFrozen(article.Image)).toBe(false);
  article.Image.Url = '/changed.jpg'; entry.DisplayName = 'Changed';
  hub.DisplayName = 'Mutated input';
  expect(view.rows[0].reviews[0].Image.Url).toBe('/cover.jpg');
  expect(view.rows[0].item.DisplayName).toBe('Item 1');
  expect(view.rows[0].item).toMatchObject({ EditionLabel: 'First edition', PublisherLabel: 'Publisher', StudioLabel: 'Studio' });
  expect(model.collections[0]).toMatchObject({ Kind: 'series', Description: 'Introduction', HubPage: [page] });
  expect(model.collectionView(100).collection.DisplayName).toBe('Collection 100');
  expect(ids(model.collectionsForArticle(article))).toEqual([100, 101]);
});

test.each([root, '/Root/Content/Other/Editorial', `${root}/../Editorial`, `${root}/(private)/Editorial`])('invalid editorial root %s is rejected', path => {
  expect(createEditorialLayer({ root, editorialRoot: path }).error).toBe('invalid-editorial-root');
});

test('the explicit technical editorial branch is allowed, while deeper technical nodes and unrelated branches stay excluded', () => {
  const configured = `${root}/(editorial)`;
  const entry = item(1, { Path: `${configured}/Items/one` });
  const group = collection(100, { Path: `${configured}/Collections/one` });
  const goodReview = review(10);
  const technicalReview = review(11, { Path: `${configured}/Reviews/private` });
  const model = createEditorialLayer({ root, editorialRoot: configured,
    items: [entry, item(2, { Path: `${configured}/Items/(private)/two` }), item(3, { Path: `${root}/(other)/Items/three` })],
    collections: [group], articles: [goodReview, technicalReview],
    memberships: [membership(200, entry, group, 1, { Path: `${configured}/Memberships/one` }),
      membership(201, { ...entry, Path: `${root}/(other)/Items/one` }, group, 2, { Path: `${configured}/Memberships/two` })],
    annotations: [annotation(300, goodReview, entry, { Path: `${configured}/Annotations/one` }),
      annotation(301, technicalReview, entry, { Path: `${configured}/Annotations/two` })] });
  expect(model.error).toBeUndefined();
  expect(ids(model.items)).toEqual([1]);
  expect(model.memberships).toHaveLength(1);
  expect(ids(model.collectionView(group).reviews)).toEqual([10]);
  expect(model.hubForPage({ Id: 99, Type: 'SmartFolder', Path: configured })).toBeNull();
});

test('existing annotations anywhere in the same site may link canonical editorial items without trusting their Target expansions', () => {
  const entry = item(1); const article = review(10);
  const model = layer({ items: [entry], articles: [article], annotations: [
    annotation(300, article, entry, { Path: `${root}/(structure)/Editorial/a` }),
    annotation(301, article, entry, { Path: '/Root/Content/Other/(structure)/Editorial/b' }),
    annotation(302, { ...article, Path: '/Root/Content/Other/review' }, entry, { Path: `${root}/(structure)/Editorial/c` }),
  ] });
  expect(model.error).toBeUndefined();
  expect(rowIds(model.itemViewsForArticle(article))).toEqual([1]);
});

test('the public general catalogue retains listed membership-free items and their canonical reviews', () => {
  const grouped = item(1); const standalone = item(2); const noReview = item(3); const hidden = item(4, { IsListed: false });
  const group = collection(100); const article = review(10);
  const model = layer({ items: [grouped, standalone, noReview, hidden], collections: [group],
    memberships: [membership(200, grouped, group, 1)], articles: [article], annotations: [annotation(300, article, standalone)] });
  const rows = model.ungroupedItems();
  expect(rowIds(rows)).toEqual([2, 3]);
  expect(ids(rows[0].reviews)).toEqual([10]);
  expect(rows[1].reviews).toEqual([]);
  expect(rows.every(row => row.membership === null && row.position === null)).toBe(true);
});
