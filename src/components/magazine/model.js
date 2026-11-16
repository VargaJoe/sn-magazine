import { contentRoute, isHidden, plainText, references } from '../editorial/repository';
import { publicationTime } from '../../page-meta';

const articleTypes = new Set(['LeisureArticle', 'LeisureBookReview', 'LeisureTvReview',
  'LeisureGameReview', 'LeisureAnimeReview', 'LeisureMangaReview']);
const collator = new Intl.Collator('hu', { sensitivity: 'base', numeric: true });
const text = value => plainText(typeof value === 'string' ? value : '').normalize('NFC');
const nameOf = item => text(item?.DisplayName || item?.Title || item?.Name);
const pathOf = item => typeof item?.Path === 'string' ? item.Path.replace(/\/+$/, '') : '';
const idOf = item => item?.Id == null ? '' : String(item.Id);
const expanded = value => references(value).length ? references(value) :
  (value && typeof value === 'object' && !Array.isArray(value) && !('results' in value) ? [value] : []);
const sameItem = (left, right) => !!left && !!right &&
  ((idOf(left) !== '' && idOf(left) === idOf(right)) ||
    (pathOf(left) !== '' && pathOf(left) === pathOf(right)));
const compareIdentity = (left, right) => collator.compare(idOf(left), idOf(right)) ||
  pathOf(left).localeCompare(pathOf(right)) || nameOf(left).localeCompare(nameOf(right));
const compareTitle = (left, right) => collator.compare(nameOf(left), nameOf(right)) || compareIdentity(left, right);
const timeOf = item => publicationTime(item?.PublishDate);
const compareLatest = (left, right) => (timeOf(right) ?? -Infinity) - (timeOf(left) ?? -Infinity) ||
  compareIdentity(left, right);
const compareSort = sort => sort === 'title' ? compareTitle : sort === 'oldest' ?
  ((left, right) => (timeOf(left) ?? Infinity) - (timeOf(right) ?? Infinity) || compareIdentity(left, right)) : compareLatest;
const normalName = value => text(value).toLocaleLowerCase('hu');
const hasTechnicalPath = item => pathOf(item).split('/').some(segment => {
  try { return decodeURIComponent(segment).startsWith('('); } catch (_) { return true; }
});

// Repository expansions may repeat the same content by id or by path. Keep a
// deterministic representative without changing the caller's catalogue.
function uniqueItems(items, compare = compareLatest) {
  const ids = new Set();
  const paths = new Set();
  return (Array.isArray(items) ? items : []).filter(Boolean).slice().sort(compare).filter(item => {
    const id = idOf(item);
    const path = pathOf(item);
    const duplicate = (id && ids.has(id)) || (path && paths.has(path));
    if (id) ids.add(id);
    if (path) paths.add(path);
    return !duplicate;
  });
}

export function annotationFor(item, annotations = []) {
  return (Array.isArray(annotations) ? annotations : []).filter(annotation =>
    !isHidden(annotation) && expanded(annotation.Target).some(target => sameItem(item, target)))
    .sort(compareIdentity)[0] || null;
}

export function seriesName(item, annotations = []) {
  return text(annotationFor(item, annotations)?.Series) || text(item?.Series);
}

export function sequenceNumber(item, annotations = [], mode = 'publisher') {
  const field = { publisher: 'PublisherSequence', original: 'OriginalSequence', timeline: 'TimelineSequence' }[mode] || 'SequenceNumber';
  const value = annotationFor(item, annotations)?.[field];
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function publishedItems(items, root, now = Date.now()) {
  return uniqueItems(items).filter(item => {
    const time = timeOf(item);
    const year = time === null ? null : new Date(time).getUTCFullYear();
    return articleTypes.has(item.Type) && !isHidden(item) && !hasTechnicalPath(item) &&
      !!contentRoute(item, root) && time !== null && year > 1 && year < 9999 && time <= now;
  });
}

export function visibleHubs(items, root = process.env.REACT_APP_DATA_PATH) {
  return uniqueItems(items).filter(item => item.Type === 'SmartFolder' && !isHidden(item) && !hasTechnicalPath(item) && contentRoute(item, root));
}

export function categoryFor(item, categories = []) {
  const path = pathOf(item);
  if (!path) return null;
  return (Array.isArray(categories) ? categories : []).filter(category =>
    (!category.Type || category.Type === 'LeisureCategory') && !isHidden(category) && !hasTechnicalPath(category) &&
    pathOf(category) && (path === pathOf(category) || path.startsWith(`${pathOf(category)}/`)))
    .sort((left, right) => pathOf(right).length - pathOf(left).length || compareIdentity(left, right))[0] || null;
}

export function groupByYear(items) {
  const groups = new Map();
  uniqueItems(items).forEach(item => {
    const time = timeOf(item);
    if (time === null) return;
    const year = new Date(time).getUTCFullYear();
    if (year <= 1 || year >= 9999) return;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(item);
  });
  return [...groups].sort(([left], [right]) => right - left).map(([year, grouped]) => ({ year, items: grouped }));
}

export function seriesGroups(items, annotations = []) {
  const groups = new Map();
  uniqueItems(items).forEach(item => {
    const name = seriesName(item, annotations);
    if (!name) return;
    const key = normalName(name);
    if (!groups.has(key)) groups.set(key, { name, items: [] });
    groups.get(key).items.push(item);
  });
  return [...groups.values()].sort((left, right) => collator.compare(left.name, right.name));
}

export function authorGroups(items) {
  const groups = [];
  uniqueItems(items).forEach(item => {
    expanded(item.BookAuthor).filter(author => !isHidden(author) && nameOf(author)).forEach(author => {
      let group = groups.find(candidate => sameItem(candidate.author, author));
      // Expanded names without identity are insufficient to merge two people.
      if (!idOf(author) && !pathOf(author)) return;
      if (!group) {
        group = { author, name: nameOf(author), items: [] };
        groups.push(group);
      }
      if (!group.items.some(member => sameItem(member, item))) group.items.push(item);
    });
  });
  return groups.filter(group => group.items.length >= 2)
    .sort((left, right) => collator.compare(left.name, right.name) || compareIdentity(left.author, right.author));
}

function tagsOf(item) {
  const values = Array.isArray(item?.Tags) ? item.Tags : [item?.Tags];
  return new Set(values.flatMap(value => typeof value === 'string' ? value.split(/[,;]/) : [])
    .map(normalName).filter(Boolean));
}

export function relatedItems(current, items, annotations = [], limit = 4) {
  const series = normalName(seriesName(current, annotations));
  const tags = tagsOf(current);
  const related = uniqueItems(items).filter(item => !sameItem(item, current)).map(item => ({
    item,
    sameSeries: !!series && normalName(seriesName(item, annotations)) === series,
    commonTags: [...tagsOf(item)].filter(tag => tags.has(tag)).length,
  })).filter(candidate => candidate.sameSeries || candidate.commonTags > 0);
  related.sort((left, right) => Number(right.sameSeries) - Number(left.sameSeries) ||
    right.commonTags - left.commonTags || compareLatest(left.item, right.item));
  const count = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 4;
  return related.slice(0, count).map(candidate => candidate.item);
}

export function orderItems(items, annotations = [], mode = 'publisher', sort = 'latest') {
  const placed = [];
  const unplaced = [];
  uniqueItems(items).forEach(item => (sequenceNumber(item, annotations, mode) === null ? unplaced : placed).push(item));
  placed.sort((left, right) => sequenceNumber(left, annotations, mode) - sequenceNumber(right, annotations, mode) || compareTitle(left, right));
  unplaced.sort(compareSort(sort));
  return { placed, unplaced };
}

export function seriesNeighbours(current, items, annotations = []) {
  const series = seriesName(current, annotations);
  const members = series ? uniqueItems(items).filter(item =>
    normalName(seriesName(item, annotations)) === normalName(series)) : [];
  const { placed, unplaced } = orderItems(members, annotations, 'default');
  const ordered = [...placed, ...unplaced];
  const numbers = placed.map(item => sequenceNumber(item, annotations, 'default'));
  const index = ordered.findIndex(item => sameItem(item, current));
  const known = index !== -1 && unplaced.length === 0 && new Set(numbers).size === numbers.length;
  return { series, items: ordered, previous: known ? ordered[index - 1] || null : null,
    next: known ? ordered[index + 1] || null : null, position: known ? index + 1 : null, total: ordered.length };
}
