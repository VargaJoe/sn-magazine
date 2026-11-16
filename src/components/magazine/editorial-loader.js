import { loadWithTimeout } from '../../page-load';
import { contentRoute, isHidden, references, repositoryPath } from '../editorial/repository';
import { publishedItems } from './model';
import { publicationTime } from '../../page-meta';

const PAGE_SIZE = 200;
const LIMIT = 5000;
const CHUNK_SIZE = 100;
const commonFields = ['Id', 'Path', 'Type', 'Hidden', 'DisplayName'];
const referenceFields = ['Id', 'Path', 'Type', 'Hidden', 'IsListed', 'PublishDate'];
const fields = {
  EditorialItem: [...commonFields, 'IsListed', 'MediaKind', 'ItemScope', 'EditionLabel',
    'PublisherLabel', 'ImprintLabel', 'DistributorLabel', 'StudioLabel'],
  EditorialCollection: [...commonFields, 'IsListed', 'Description', 'Kind', 'OrderMode'],
  EditorialMembership: [...commonFields, 'Position', 'NumberLabel'],
  EditorialAnnotation: [...commonFields, 'Description', 'AccentColor', 'Featured', 'StartHere', 'Index'],
};
const expansions = { EditorialItem: ['ParentItem'], EditorialCollection: ['ParentCollection', 'HubPage'],
  EditorialMembership: ['Item', 'Collection'], EditorialAnnotation: ['Target', 'Items'] };
const inside = (path, root) => !!path && !!root && path !== root && path.startsWith(`${root}/`);
const technical = path => path.split('/').some(part => {
  try { return decodeURIComponent(part).startsWith('('); } catch (_) { return true; }
});
const idOf = node => {
  const value = node?.Id;
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const expanded = value => {
  if (!value || typeof value !== 'object' || value.__deferred) return [];
  if (Array.isArray(value) || Array.isArray(value.results)) return references(value);
  return 'results' in value ? [] : [value];
};
const pick = (node, keys) => Object.fromEntries(keys.filter(key => node?.[key] !== undefined).map(key => [key, node[key]]));
const chunks = values => Array.from({ length: Math.ceil(values.length / CHUNK_SIZE) }, (_, index) =>
  values.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
const abortError = () => Object.assign(Error('Editorial loading was cancelled.'), { name: 'AbortError' });
const checkAbort = signal => { if (signal?.aborted) throw abortError(); };

function configuredPath(root, value) {
  const base = repositoryPath(root);
  let folder = value;
  if (typeof value !== 'string') {
    const refs = expanded(value);
    if (refs.length !== 1) throw Error('Invalid editorial root');
    [folder] = refs;
    if (isHidden(folder) || folder.__deferred || (folder.Type != null && folder.Type !== 'Folder')) throw Error('Invalid editorial root');
  }
  const path = repositoryPath(typeof folder === 'string' ? folder : folder?.Path);
  if (!base || !inside(path, base) || path.slice(base.length + 1).includes('/')) throw Error('Invalid editorial root');
  return { base, path };
}

/** Load only the explicit opt-in public editorial graph; never use a widget's raw query. */
export async function loadEditorialData(repo, { root, editorialRoot, articles = [], categories = [], pages = [] } = {}, signal) {
  checkAbort(signal);
  const { base, path } = configuredPath(root, editorialRoot);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const activeSignal = controller.signal;
  const scopePath = (node, type) => {
    const nodePath = repositoryPath(node?.Path);
    return type === 'EditorialAnnotation' ? inside(nodePath, base) :
      inside(nodePath, path) && !technical(nodePath.slice(path.length));
  };
  const validNode = (node, type) => idOf(node) !== null && node?.Type === type && !isHidden(node) && scopePath(node, type) &&
    (!['EditorialItem', 'EditorialCollection'].includes(type) || node.IsListed === true);
  const selectFor = type => [...fields[type], ...expansions[type].flatMap(field => referenceFields.map(key => `${field}/${key}`))];
  const project = (node, type) => ({ ...pick(node, fields[type]), Path: repositoryPath(node.Path), ...Object.fromEntries(expansions[type].map(field =>
    [field, expanded(node[field]).map(ref => pick(ref, referenceFields))])) });

  async function loadPages(type, query, queryPath) {
    const result = [];
    const seenIds = new Set();
    const seenPaths = new Set();
    let previousId = 0;
    // Read a final empty page rather than trusting __count, which can include unreadable nodes.
    // Advancing by actual returned rows also supports a server-enforced page size below $top.
    for (let skip = 0; skip <= LIMIT;) {
      checkAbort(activeSignal);
      const response = await loadWithTimeout({ load: request => repo.loadCollection(request) }, {
        path: queryPath, oDataOptions: { query, top: PAGE_SIZE, skip, select: selectFor(type),
          expand: expansions[type], orderby: [['Id', 'asc']], metadata: 'no',
          enableautofilters: 'on', enablelifespanfilter: 'on' },
      }, activeSignal);
      checkAbort(activeSignal);
      const page = response?.d?.results;
      if (!Array.isArray(page) || page.length > PAGE_SIZE) throw Error('Incomplete editorial page');
      if (!page.length) {
        if (response.d.__next || response.d['@odata.nextLink']) throw Error('Incomplete editorial continuation');
        return result;
      }
      if (result.length + page.length > LIMIT) throw Error('Editorial catalogue limit reached');
      for (const node of page) {
        const id = idOf(node);
        const nodePath = repositoryPath(node?.Path);
        if (!validNode(node, type) || seenIds.has(id) || seenPaths.has(nodePath) || id <= previousId) {
          throw Error('Invalid editorial page');
        }
        seenIds.add(id); seenPaths.add(nodePath); previousId = id;
        result.push(project(node, type));
      }
      skip += page.length;
    }
    throw Error('Editorial catalogue limit reached');
  }
  function merge(target, incoming) {
    incoming.forEach(node => {
      const id = idOf(node);
      const byId = target.find(value => idOf(value) === id);
      const byPath = target.find(value => value.Path === node.Path);
      const existing = byId || byPath;
      if (existing) {
        if (idOf(existing) !== id || existing.Path !== node.Path || JSON.stringify(existing) !== JSON.stringify(node)) {
          throw Error('Conflicting editorial identity');
        }
        return;
      }
      target.push(node);
      if (target.length > LIMIT) throw Error('Editorial catalogue limit reached');
    });
  }
  const queryFor = (queryRoot, type) => `+InTree:${JSON.stringify(queryRoot)} +Type:${type}`;
  try {
    const [items, collections] = await Promise.all(['EditorialItem', 'EditorialCollection'].map(type =>
      loadPages(type, `${queryFor(path, type)} +IsListed:true`, path)));
    checkAbort(activeSignal);
    const canonicalItems = new Map(items.map(node => [idOf(node), node]));
    const canonicalCollections = new Map(collections.map(node => [idOf(node), node]));
    const publicCategories = (Array.isArray(categories) ? categories : []).filter(node => node?.Type === 'LeisureCategory' &&
      idOf(node) !== null && !isHidden(node) && !!contentRoute(node, base) && !technical(repositoryPath(node.Path)));
    const publicPages = (Array.isArray(pages) ? pages : []).filter(node => ['Page', 'SmartFolder'].includes(node?.Type) &&
      idOf(node) !== null && !isHidden(node) && !!contentRoute(node, base) && !technical(repositoryPath(node.Path)) &&
      (node.PublishDate == null || (publicationTime(node.PublishDate) !== null && publicationTime(node.PublishDate) <= Date.now())));
    const targets = [...publishedItems(articles, base), ...publicCategories, ...publicPages];
    const canonicalTargets = new Map();
    targets.filter(node => idOf(node) !== null).forEach(node => {
      const existing = canonicalTargets.get(idOf(node));
      if (existing && (repositoryPath(existing.Path) !== repositoryPath(node.Path) || existing.Type !== node.Type)) {
        throw Error('Conflicting editorial target');
      }
      canonicalTargets.set(idOf(node), node);
    });
    const targetIds = [...canonicalTargets.keys()].sort((a, b) => a - b);
    const itemIds = [...canonicalItems.keys()].sort((a, b) => a - b);
    const collectionIds = [...canonicalCollections.keys()].sort((a, b) => a - b);
    const memberships = [];
    const annotations = [];
    await Promise.all([
      (async () => {
        for (const itemChunk of chunks(itemIds)) {
          for (const collectionChunk of chunks(collectionIds)) {
            const query = `${queryFor(path, 'EditorialMembership')} +Item:(${itemChunk.join(' ')}) +Collection:(${collectionChunk.join(' ')})`;
            merge(memberships, await loadPages('EditorialMembership', query, path));
          }
        }
      })(),
      (async () => {
        for (const targetChunk of chunks(targetIds)) {
          const query = `${queryFor(base, 'EditorialAnnotation')} +Target:(${targetChunk.join(' ')})`;
          merge(annotations, await loadPages('EditorialAnnotation', query, base));
        }
      })(),
    ]);
    checkAbort(activeSignal);
    const resolve = (ref, canonical) => {
      const node = canonical.get(idOf(ref));
      if (!node || isHidden(ref) || (ref.Path != null && repositoryPath(ref.Path) !== repositoryPath(node.Path)) ||
          (ref.Type != null && ref.Type !== node.Type)) return null;
      return node;
    };
    memberships.forEach(node => {
      if (node.Item.length !== 1 || node.Collection.length !== 1 || !resolve(node.Item[0], canonicalItems) ||
          !resolve(node.Collection[0], canonicalCollections)) throw Error('Incomplete editorial membership');
    });
    const annotatedTargets = new Set();
    annotations.forEach(node => {
      if (node.Target.length !== 1 || !resolve(node.Target[0], canonicalTargets)) throw Error('Incomplete editorial annotation');
      const targetId = idOf(node.Target[0]);
      if (annotatedTargets.has(targetId)) throw Error('Duplicate editorial annotation');
      annotatedTargets.add(targetId);
      node.Items = node.Items.filter(ref => resolve(ref, canonicalItems));
    });
    return { items, collections, memberships, annotations };
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
