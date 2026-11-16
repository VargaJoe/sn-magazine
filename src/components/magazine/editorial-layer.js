import { contentRoute, isHidden, plainText, references, repositoryPath } from '../editorial/repository';
import { publicationTime } from '../../page-meta';
import { publishedItems } from './model';

const collator = new Intl.Collator('hu', { sensitivity: 'base', numeric: true });
const text = value => plainText(typeof value === 'string' ? value : '').normalize('NFC');
const choice = value => Array.isArray(value) ? value[0] : value;
const idOf = node => typeof node?.Id === 'string' || typeof node?.Id === 'number' ? String(node.Id) : '';
const pathOf = node => repositoryPath(node?.Path);
const nameOf = node => text(node?.DisplayName || node?.Title || node?.Name);
const identity = node => idOf(node) ? `id:${idOf(node)}` : `path:${pathOf(node)}`;
const compareIdentity = (a, b) => collator.compare(idOf(a), idOf(b)) || pathOf(a).localeCompare(pathOf(b));
const compareTitle = (a, b) => collator.compare(nameOf(a), nameOf(b)) || compareIdentity(a, b);
const inside = (path, root) => !!path && !!root && (path === root || path.startsWith(`${root}/`));
const technical = path => path.split('/').some(part => {
  try { return decodeURIComponent(part).startsWith('('); } catch (_) { return true; }
});

// Reference objects are identifiers, never a second source of public content.
// Deferred URLs and malformed wrappers are deliberately not dereferenced here.
const expanded = value => {
  if (!value || typeof value !== 'object' || value.__deferred) return [];
  if (Array.isArray(value) || Array.isArray(value.results)) return references(value);
  return 'results' in value ? [] : [value];
};

export function positivePosition(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// Copy before freezing: a layer must never freeze or mutate repository/cache data.
function immutable(value, seen = new WeakMap()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  Object.keys(value).forEach(key => { copy[key] = immutable(value[key], seen); });
  return Object.freeze(copy);
}

const emptyView = collection => immutable({ collection: collection || null, children: [], rows: [],
  placed: [], unplaced: [], reviews: [], totalItems: 0, totalReviews: 0, conflicts: [] });
const emptyNeighbours = collection => immutable({ collection: collection || null, previous: null,
  next: null, current: null, position: null, total: 0, conflicts: [] });

function failedLayer(error) {
  return Object.freeze({ enabled: true, error, items: Object.freeze([]), collections: Object.freeze([]),
    memberships: Object.freeze([]), hubForPage: () => null, collectionView: () => emptyView(), ungroupedItems: () => Object.freeze([]),
    groupsForArticles: () => immutable({ groups: [], ungrouped: [] }), itemViewsForArticle: () => Object.freeze([]),
    collectionsForArticle: () => Object.freeze([]), neighboursForArticle: () => emptyNeighbours() });
}

/**
 * Build the opt-in public editorial catalogue from server-approved records.
 * Missing/foreign references are omitted; ambiguous identities, target annotations,
 * active memberships and parent cycles reject the layer instead of selecting one.
 */
export function createEditorialLayer({ root, editorialRoot, items = [], collections = [],
  memberships = [], annotations = [], articles = [] } = {}) {
  const base = repositoryPath(root);
  const editorial = repositoryPath(editorialRoot);
  if (!base || !editorial || editorial === base || !inside(editorial, base) || editorial.slice(base.length + 1).includes('/')) {
    return failedLayer('invalid-editorial-root');
  }
  const now = Date.now();
  const safeNode = node => node && !isHidden(node) && pathOf(node) !== editorial &&
    inside(pathOf(node), editorial) && !technical(pathOf(node).slice(editorial.length));
  const listed = (nodes, type) => (Array.isArray(nodes) ? nodes : []).filter(node =>
    safeNode(node) && node.Type === type && node.IsListed === true);
  const active = (nodes, type) => (Array.isArray(nodes) ? nodes : []).filter(node =>
    (type === 'EditorialAnnotation' ? node && !isHidden(node) && pathOf(node) !== base && inside(pathOf(node), base) : safeNode(node)) && node.Type === type);

  try {
    function index(nodes) {
      const ids = new Map();
      const paths = new Map();
      const canonical = [];
      nodes.map(node => immutable(node)).sort((a, b) => Number(!!idOf(b)) - Number(!!idOf(a)) || compareIdentity(a, b)).forEach(node => {
        const id = idOf(node);
        const path = pathOf(node);
        const existing = (id && ids.get(id)) || (path && paths.get(path));
        if (existing) {
          if ((id && idOf(existing) && id !== idOf(existing)) || path !== pathOf(existing)) {
            throw new Error('ambiguous-identity');
          }
          return;
        }
        if (id) ids.set(id, node);
        if (path) paths.set(path, node);
        canonical.push(node);
      });
      return { nodes: canonical, ids, paths };
    }
    const itemIndex = index(listed(items, 'EditorialItem'));
    const collectionIndex = index(listed(collections, 'EditorialCollection'));
    const articleIndex = index(publishedItems(articles, base, now));
    const referenceRoot = candidate => candidate.Type === 'EditorialItem' || candidate.Type === 'EditorialCollection' ? editorial : base;
    function resolve(ref, targetIndex) {
      if (!ref || typeof ref !== 'object' || ref.__deferred || isHidden(ref)) return null;
      const id = idOf(ref);
      const path = pathOf(ref);
      if (ref.Path != null && !path) return null;
      const byId = id ? targetIndex.ids.get(id) : null;
      const byPath = path ? targetIndex.paths.get(path) : null;
      const node = byId || byPath;
      if (!node || (id && idOf(node) !== id) || (path && pathOf(node) !== path) ||
          (ref.Type != null && ref.Type !== node.Type) || !inside(pathOf(node), referenceRoot(node)) ||
          technical(pathOf(node).slice(referenceRoot(node) === editorial ? editorial.length : 0))) return null;
      return node;
    }
    const one = (value, targetIndex) => {
      const refs = expanded(value);
      return refs.length === 1 ? resolve(refs[0], targetIndex) : null;
    };
    const unique = nodes => [...new Map(nodes.filter(Boolean).map(node => [identity(node), node])).values()];
    const asRef = node => node ? { ...(idOf(node) ? { Id: node.Id } : {}), Path: pathOf(node), Type: node.Type } : null;
    const parentItems = new Map(itemIndex.nodes.map(node => [identity(node), one(node.ParentItem, itemIndex)]));
    const parentCollections = new Map(collectionIndex.nodes.map(node => [identity(node), one(node.ParentCollection, collectionIndex)]));
    function rejectCycles(nodes, parents, code) {
      const complete = new Set();
      nodes.forEach(node => {
        const trail = new Set();
        let current = node;
        while (current && !complete.has(identity(current))) {
          const key = identity(current);
          if (trail.has(key)) throw new Error(code);
          trail.add(key);
          current = parents.get(key);
        }
        trail.forEach(key => complete.add(key));
      });
    }
    rejectCycles(itemIndex.nodes, parentItems, 'item-parent-cycle');
    rejectCycles(collectionIndex.nodes, parentCollections, 'collection-parent-cycle');

    const presentation = (node, fields) => ({ ...asRef(node),
      DisplayName: nameOf(node), ...Object.fromEntries(fields.map(field => [field, text(choice(node[field]))])) });
    const publicItems = new Map(itemIndex.nodes.map(node => [identity(node), immutable({
      ...presentation(node, ['MediaKind', 'ItemScope', 'EditionLabel', 'PublisherLabel', 'ImprintLabel', 'DistributorLabel', 'StudioLabel']),
      IsListed: true, ParentItem: parentItems.get(identity(node)) ? [asRef(parentItems.get(identity(node)))] : [],
    })]));
    const safePage = page => page && ['Page', 'SmartFolder'].includes(page.Type) && !isHidden(page) &&
      inside(pathOf(page), base) && !technical(pathOf(page)) && !!contentRoute(page, base) &&
      (page.PublishDate == null || (publicationTime(page.PublishDate) !== null && publicationTime(page.PublishDate) <= now));
    const publicCollections = new Map(collectionIndex.nodes.map(node => [identity(node), immutable({
      ...presentation(node, ['Description', 'Kind']), IsListed: true,
      OrderMode: choice(node.OrderMode) === 'manual' ? 'manual' : 'unordered',
      ParentCollection: parentCollections.get(identity(node)) ? [asRef(parentCollections.get(identity(node)))] : [],
      HubPage: expanded(node.HubPage).filter(safePage).map(asRef),
    })]));
    // Review objects come only from the canonical, publication-filtered input, never Target expansions.
    const publicArticles = new Map(articleIndex.nodes.map(node => [identity(node), immutable(node)]));
    const itemFor = node => publicItems.get(identity(node));
    const collectionFor = node => publicCollections.get(identity(node));
    const articleFor = node => publicArticles.get(identity(node));
    const canonicalArticle = node => resolve(node, articleIndex);
    const canonicalCollection = value => {
      if (value && typeof value === 'object') return resolve(value, collectionIndex);
      return collectionIndex.ids.get(String(value)) || collectionIndex.paths.get(repositoryPath(value)) || null;
    };

    const membershipPairs = new Map();
    const publicMemberships = [];
    index(active(memberships, 'EditorialMembership')).nodes.forEach(node => {
      const item = one(node.Item, itemIndex);
      const collection = one(node.Collection, collectionIndex);
      if (!item || !collection) return;
      const key = `${identity(item)}\n${identity(collection)}`;
      if (membershipPairs.has(key)) throw new Error('duplicate-membership');
      const member = immutable({ ...asRef(node), Item: [itemFor(item)], Collection: [collectionFor(collection)],
        Position: positivePosition(node.Position), NumberLabel: text(node.NumberLabel) });
      membershipPairs.set(key, member);
      publicMemberships.push(member);
    });
    const annotationsByArticle = new Map();
    index(active(annotations, 'EditorialAnnotation')).nodes.forEach(node => {
      const article = one(node.Target, articleIndex);
      if (!article) return;
      const key = identity(article);
      if (annotationsByArticle.has(key)) throw new Error('duplicate-annotation');
      annotationsByArticle.set(key, unique(expanded(node.Items).map(ref => resolve(ref, itemIndex))));
    });
    const reviewsForItem = new Map(itemIndex.nodes.map(node => [identity(node), []]));
    articleIndex.nodes.forEach(article => (annotationsByArticle.get(identity(article)) || []).forEach(item => {
      reviewsForItem.get(identity(item)).push(articleFor(article));
    }));
    const compareReviews = sort => sort === 'title' ? compareTitle : (a, b) => {
      const direction = sort === 'oldest' ? 1 : -1;
      return direction * (publicationTime(a.PublishDate) - publicationTime(b.PublishDate)) || compareIdentity(a, b);
    };
    const sortedReviews = (values, sort = 'latest') => unique(values).sort(compareReviews(sort));
    const childrenOf = parent => collectionIndex.nodes.filter(node => parentCollections.get(identity(node)) === parent).sort(compareTitle);
    const descendants = parent => [parent, ...childrenOf(parent).flatMap(descendants)];
    const ancestors = node => {
      const result = [];
      let parent = parentCollections.get(identity(node));
      while (parent) { result.push(parent); parent = parentCollections.get(identity(parent)); }
      return result;
    };
    const memberFor = (item, collection) => membershipPairs.get(`${identity(item)}\n${identity(collection)}`) || null;
    const poolFor = collection => {
      const collectionKeys = new Set(descendants(collection).map(identity));
      return unique(publicMemberships.filter(member => collectionKeys.has(identity(member.Collection[0])))
        .map(member => member.Item[0]));
    };
    function rowFor(item, collection) {
      const membership = collection ? memberFor(item, collection) : null;
      return { item: itemFor(item), membership,
        position: collection && collectionFor(collection).OrderMode === 'manual' ? membership?.Position ?? null : null,
        numberLabel: membership?.NumberLabel || '', reviews: sortedReviews(reviewsForItem.get(identity(item)) || []) };
    }
    function ungroupedItems() {
      const grouped = new Set(publicMemberships.map(member => identity(member.Item[0])));
      return immutable(itemIndex.nodes.filter(item => !grouped.has(identity(item))).sort(compareTitle).map(item => rowFor(item, null)));
    }
    function collectionView(value, { sort = 'latest', mode = 'order', hub } = {}) {
      const collection = canonicalCollection(value);
      if (!collection) return emptyView();
      const candidateHub = canonicalCollection(hub);
      const poolRoot = candidateHub && (candidateHub === collection || ancestors(collection).includes(candidateHub)) ? candidateHub : collection;
      const rows = poolFor(poolRoot).map(item => rowFor(item, collection));
      const compareRows = (a, b) => {
        if (sort === 'title') return compareTitle(a.item, b.item);
        const ar = sortedReviews(a.reviews, sort)[0];
        const br = sortedReviews(b.reviews, sort)[0];
        return ar && br ? compareReviews(sort)(ar, br) || compareTitle(a.item, b.item) :
          ar ? -1 : br ? 1 : compareTitle(a.item, b.item);
      };
      const placed = rows.filter(row => row.position !== null).sort((a, b) => a.position - b.position || compareTitle(a.item, b.item));
      const unplaced = rows.filter(row => row.position === null).sort(compareRows);
      const positions = new Map();
      placed.forEach(row => positions.set(row.position, [...(positions.get(row.position) || []), row.item]));
      const conflicts = [...positions].filter(([, members]) => members.length > 1)
        .map(([position, members]) => ({ type: 'duplicate-position', position, items: members }));
      const reviews = sortedReviews(rows.flatMap(row => row.reviews), sort);
      return immutable({ collection: collectionFor(collection), children: childrenOf(collection).map(collectionFor),
        rows: mode === 'publication' ? rows.sort(compareRows) : [...placed, ...unplaced], placed, unplaced,
        reviews, totalItems: rows.length, totalReviews: reviews.length, conflicts });
    }
    function itemViewsForArticle(article) {
      const canonical = canonicalArticle(article);
      if (!canonical) return Object.freeze([]);
      return immutable((annotationsByArticle.get(identity(canonical)) || []).map(item => ({
        ...rowFor(item, null), collections: collectionIndex.nodes.map(collection => ({ collection, membership: memberFor(item, collection) }))
          .filter(entry => entry.membership).sort((a, b) => compareTitle(a.collection, b.collection))
          .map(({ collection, membership }) => ({ collection: collectionFor(collection), membership,
            position: collectionFor(collection).OrderMode === 'manual' ? membership.Position : null, numberLabel: membership.NumberLabel })),
      })));
    }
    function collectionsForArticle(article) {
      const direct = itemViewsForArticle(article).flatMap(view => view.collections.map(entry => canonicalCollection(entry.collection)));
      return immutable(unique(direct.flatMap(node => [node, ...ancestors(node)])).sort(compareTitle).map(collectionFor));
    }
    function groupsForArticles(values) {
      const selected = sortedReviews((Array.isArray(values) ? values : []).map(canonicalArticle).filter(Boolean).map(articleFor));
      const selectedKeys = new Set(selected.map(identity));
      const groupedKeys = new Set();
      const groups = collectionIndex.nodes.filter(node => !parentCollections.get(identity(node))).sort(compareTitle).map(node => {
        const view = collectionView(node);
        const reviews = view.reviews.filter(article => selectedKeys.has(identity(article)));
        reviews.forEach(article => groupedKeys.add(identity(article)));
        return { collection: collectionFor(node), name: nameOf(node), items: reviews,
          totalItems: view.totalItems, totalReviews: reviews.length };
      }).filter(group => group.items.length);
      return immutable({ groups, ungrouped: selected.filter(article => !groupedKeys.has(identity(article))) });
    }
    function neighboursForArticle(article, value) {
      const articleItems = itemViewsForArticle(article);
      let collection = value == null ? null : canonicalCollection(value);
      if (value == null) {
        const candidates = unique(articleItems.flatMap(view => view.collections)
          .filter(entry => entry.collection.OrderMode === 'manual' && entry.position !== null)
          .map(entry => canonicalCollection(entry.collection)));
        const leaves = candidates.filter(node => !candidates.some(other => other !== node && ancestors(other).includes(node)));
        if (leaves.length === 1) [collection] = leaves;
      }
      if (!collection) return emptyNeighbours();
      const view = collectionView(collection);
      const currentRows = view.placed.filter(row => articleItems.some(candidate => identity(candidate.item) === identity(row.item)));
      if (collectionFor(collection).OrderMode !== 'manual' || currentRows.length !== 1 || view.conflicts.length) {
        return immutable({ ...emptyNeighbours(collectionFor(collection)), total: view.totalItems, conflicts: view.conflicts });
      }
      const current = currentRows[0];
      const index = view.placed.indexOf(current);
      return immutable({ collection: collectionFor(collection), current, previous: view.placed[index - 1] || null,
        next: view.placed[index + 1] || null, position: current.position, total: view.totalItems, conflicts: view.conflicts });
    }
    function hubForPage(page) {
      if (!safePage(page)) return null;
      const pageIndex = index([page]);
      const matches = collectionIndex.nodes.filter(node => one(node.HubPage, pageIndex));
      return matches.length === 1 ? collectionFor(matches[0]) : null;
    }
    return Object.freeze({ enabled: true, items: Object.freeze([...publicItems.values()]),
      collections: Object.freeze([...publicCollections.values()]), memberships: Object.freeze(publicMemberships),
      hubForPage, collectionView, ungroupedItems, groupsForArticles, itemViewsForArticle, collectionsForArticle, neighboursForArticle });
  } catch (error) {
    return failedLayer(error.message || 'invalid-editorial-data');
  }
}
