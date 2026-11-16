import { annotationFor, authorGroups, categoryFor, groupByYear, orderItems,
  publishedItems, relatedItems, sequenceNumber, seriesGroups, seriesName, seriesNeighbours } from './model';

const root = '/Root/Content/Magazine';
const article = (Id, fields = {}) => ({ Id, Type: 'LeisureArticle', Path: `${root}/Reviews/item-${Id}`,
  DisplayName: `Article ${Id}`, PublishDate: '2025-02-01T12:00:00Z', ...fields });
const annotation = (Id, target, fields = {}) => ({ Id, Type: 'EditorialAnnotation', Target: target, ...fields });
const now = Date.parse('2026-06-01T12:00:00Z');

test('publication catalogue excludes private, technical, future, invalid and out-of-site content', () => {
  const visible = article(1, { Type: 'LeisureBookReview' });
  const input = [visible, article(2, { Hidden: true }), article(3, { Hidden: 'true' }),
    article(4, { Path: `${root}/(internal)/item` }), article(5, { Path: `${root}/%28internal%29/item` }),
    article(6, { PublishDate: '2027-01-01T00:00:00Z' }), article(7, { PublishDate: null }),
    article(8, { PublishDate: '0001-01-01T00:00:00Z' }), article(9, { PublishDate: '2025-02-31T12:00:00Z' }),
    article(10, { Path: `${root}-other/Reviews/item` }), article(11, { Type: 'LeisureCategory' }),
    article(12, { PublishDate: 'not-a-date' }), article(13, { PublishDate: '9999-12-31T00:00:00Z' }),
    article(14, { Path: `${root}/Reviews/../elsewhere` })];
  expect(publishedItems(input, root, now)).toEqual([visible]);
  expect(input).toHaveLength(14);
});

test('every supported review type is published, sorted by date and identity, and deduplicated', () => {
  const types = ['LeisureArticle', 'LeisureBookReview', 'LeisureTvReview', 'LeisureGameReview', 'LeisureAnimeReview', 'LeisureMangaReview'];
  const items = types.map((Type, index) => article(index + 1, { Type }));
  const newer = article(8, { PublishDate: '/Date(1767225600000)/' });
  expect(publishedItems([items[2], newer, ...items.reverse()], root, now).map(item => item.Id)).toEqual([8, 1, 2, 3, 4, 5, 6]);
  expect(publishedItems([article(1)], '/Root/Another', now)).toEqual([]);
});

test('annotation targets accept expanded single, array and results references; overrides are optional', () => {
  const first = article(1, { Series: '<p>Native series</p>' });
  const second = article(2);
  const third = article(3);
  const annotations = [annotation(11, { Id: '1' }, { Series: '<b>Editorial series</b>', PublisherSequence: '2', SequenceNumber: 8 }),
    annotation(12, [{ Path: second.Path }], { Series: 'Native series', OriginalSequence: 4 }),
    annotation(13, { results: [{ Id: third.Id }] }, { TimelineSequence: 6 }),
    annotation(14, { Id: first.Id }, { Series: 'Hidden series', Hidden: true })];
  expect(annotationFor(first, annotations).Id).toBe(11);
  expect(annotationFor(second, annotations).Id).toBe(12);
  expect(annotationFor(third, annotations).Id).toBe(13);
  expect(seriesName(first, annotations)).toBe('Editorial series');
  expect(seriesName(first, [annotation(1, { Id: 1 }, { Series: '<p> </p>' })])).toBe('Native series');
  expect(sequenceNumber(first, annotations)).toBe(2);
  expect(sequenceNumber(first, annotations, 'default')).toBe(8);
  expect(sequenceNumber(second, annotations, 'original')).toBe(4);
  expect(sequenceNumber(third, annotations, 'timeline')).toBe(6);
  expect(sequenceNumber(third, annotations, 'publisher')).toBeNull();
  expect(annotationFor(article(99), annotations)).toBeNull();
});

test.each([null, undefined, '', ' ', 0, -1, '0', 'bad', false, Infinity])('unset order %p does not become an invented sequence', value => {
  expect(sequenceNumber(article(1), [annotation(1, { Id: 1 }, { SequenceNumber: value })], 'default')).toBeNull();
});

test('category lookup selects the nearest visible ancestor, using path segment boundaries', () => {
  const outer = { Id: 1, Type: 'LeisureCategory', Path: root };
  const inner = { Id: 2, Type: 'LeisureCategory', Path: `${root}/Reviews` };
  const hidden = { Id: 3, Type: 'LeisureCategory', Path: `${root}/Reviews/item`, Hidden: true };
  expect(categoryFor(article(4), [outer, inner, hidden])).toBe(inner);
  expect(categoryFor(article(4, { Path: `${root}/Reviews-other/item` }), [inner, outer])).toBe(outer);
  expect(categoryFor(article(4), [])).toBeNull();
});

test('archive years are descending, members latest first and duplicates do not create entries', () => {
  const old = article(1, { PublishDate: '2023-01-01T00:00:00Z' });
  const earlier = article(2, { PublishDate: '2025-01-01T00:00:00Z' });
  const later = article(3, { PublishDate: '2025-12-01T00:00:00Z' });
  expect(groupByYear([old, earlier, later, old, article(4, { PublishDate: null })]))
    .toEqual([{ year: 2025, items: [later, earlier] }, { year: 2023, items: [old] }]);
});

test('series groups use annotation overrides, normalize case, and omit empty series', () => {
  const first = article(1, { Series: 'Old' });
  const second = article(2, { Series: ' saga ' });
  const annotations = [annotation(10, [{ Id: 1 }], { Series: 'Saga' })];
  expect(seriesGroups([second, first, first, article(3)], annotations)).toEqual([{ name: 'Saga', items: [first, second] }]);
});

test('author groups support multi-author expansions and require two distinct articles', () => {
  const shared = { Id: 100, DisplayName: 'Shared Author', Path: `${root}/Authors/shared` };
  const other = { Id: 101, DisplayName: 'Other Author', Path: `${root}/Authors/other` };
  const oneOff = { Id: 102, DisplayName: 'One Off', Path: `${root}/Authors/one-off` };
  const first = article(1, { BookAuthor: [shared, other, shared, oneOff] });
  const second = article(2, { BookAuthor: { results: [{ ...shared, Id: '100' }] } });
  const third = article(3, { BookAuthor: other });
  const groups = authorGroups([third, first, second, first]);
  expect(groups.map(group => [group.name, group.items.map(item => item.Id)]))
    .toEqual([['Other Author', [1, 3]], ['Shared Author', [1, 2]]]);
});

test('related items prioritize series, then shared normalized tags, exclude self and duplicates', () => {
  const current = article(1, { Series: 'Saga', Tags: 'Fantasy; Adventure, fantasy' });
  const sameSeries = article(2, { Series: 'saga' });
  const twoTags = article(3, { Tags: ['FANTASY', 'Adventure'] });
  const oneTag = article(4, { Tags: 'fantasy', PublishDate: '2026-01-01T00:00:00Z' });
  const unrelated = article(5, { Tags: 'History' });
  expect(relatedItems(current, [current, oneTag, twoTags, sameSeries, sameSeries, unrelated], []))
    .toEqual([sameSeries, twoTags, oneTag]);
  expect(relatedItems(current, [sameSeries, twoTags], [], 1)).toEqual([sameSeries]);
  expect(relatedItems(current, [sameSeries], [], 0)).toEqual([]);
});

test('sequence sorting preserves missing order separately and sorts tied titles with Hungarian collation', () => {
  const first = article(1, { DisplayName: 'Zebra' });
  const second = article(2, { DisplayName: 'Árnyék' });
  const unplaced = article(3);
  const latestUnplaced = article(4, { PublishDate: '2026-01-01T00:00:00Z' });
  const annotations = [annotation(11, { Id: 1 }, { PublisherSequence: 1 }), annotation(12, { Id: 2 }, { PublisherSequence: 1 })];
  const input = [unplaced, first, latestUnplaced, second];
  expect(orderItems(input, annotations, 'publisher')).toEqual({ placed: [second, first], unplaced: [latestUnplaced, unplaced] });
  expect(orderItems(input, annotations, 'publisher', 'oldest').unplaced).toEqual([unplaced, latestUnplaced]);
  expect(input).toEqual([unplaced, first, latestUnplaced, second]);
});

test('series neighbours only claim a position and adjacent articles for an unambiguous canonical order', () => {
  const members = [article(1, { Series: 'Saga' }), article(2, { Series: 'Saga' }), article(3, { Series: 'Saga' })];
  const annotations = members.map((item, index) => annotation(10 + index, { Id: item.Id }, { SequenceNumber: index + 1 }));
  expect(seriesNeighbours(members[1], members, annotations)).toEqual({ series: 'Saga', items: members,
    previous: members[0], next: members[2], position: 2, total: 3 });
  expect(seriesNeighbours(members[0], members, annotations).previous).toBeNull();
  expect(seriesNeighbours(members[2], members, annotations).next).toBeNull();
  const tied = [...annotations.slice(0, 2), annotation(12, { Id: 3 }, { SequenceNumber: 2 })];
  expect(seriesNeighbours(members[0], members, tied)).toMatchObject({ previous: null, next: null, position: null, total: 3 });
  expect(seriesNeighbours(members[0], members, annotations.slice(0, 2)))
    .toMatchObject({ previous: null, next: null, position: null, total: 3 });
  expect(seriesNeighbours(article(9), members, annotations)).toEqual({ series: '', items: [], previous: null, next: null, position: null, total: 0 });
});
