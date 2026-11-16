import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { loadWithTimeout } from '../../page-load';
import { contentRoute, references, isHidden } from '../editorial/repository';
import { publishedItems } from './model';
import { loadEditorialData } from './editorial-loader';
import { createEditorialLayer } from './editorial-layer';

const MagazineContext = createContext(null);
export const oneReference = value => references(value)[0] || (value?.Path ? value : null);
export const magazineReferences = value => references(value).length ? references(value) : (value?.Path ? [value] : []);
export const useMagazine = () => useContext(MagazineContext);
const roleFields = ['ArchivePage', 'CollectionsPage', 'SearchPage', 'AboutPage', 'NewsRoot', 'CategoryRoots', 'BrandingFolder', 'EditorialRoot', 'CollectionRoots'];

// Keep the configured selection as one predicate, including optional OR clauses.
export const editorialCatalogueQuery = query => `+(${query}) -Type:(EditorialAnnotation EditorialItem EditorialCollection EditorialMembership)`;

function publicCategories(source, root) {
  return references(source.CategoryRoots).filter(item => !isHidden(item) && contentRoute(item, root));
}

export async function loadMagazineCatalogue(repo, source, signal, root) {
  const items = [], seen = new Set();
  for (let skip = 0; skip < 5000; skip += 200) {
    const result = await loadWithTimeout({ load: request => repo.loadCollection(request) }, {
      path: root, oDataOptions: { query: source.ContentQuery, top: 200, skip, select: 'all',
        expand: ['BookAuthor', 'Target', 'RelatedContent'], metadata: 'no', enableautofilters: 'on', enablelifespanfilter: 'on' },
    }, signal);
    const page = result?.d?.results;
    if (!Array.isArray(page)) throw Error('Incomplete catalogue');
    for (const item of page) {
      if (!contentRoute(item, root) || seen.has(item.Id)) throw Error('Invalid catalogue page');
      seen.add(item.Id); items.push(item);
    }
    const count = Number(result.d.__count);
    if (Number.isFinite(count) && items.length >= count) return items;
    if (page.length < 200) {
      if (Number.isFinite(count) && count > items.length) throw Error('Truncated catalogue');
      return items;
    }
  }
  throw Error('Catalogue limit reached');
}

export function MagazineProvider({ context, widgets, children }) {
  const repo = useRepository();
  const source = widgets?.find(widget => widget.ClientComponent === 'magazine-source');
  const root = process.env.REACT_APP_DATA_PATH?.replace(/\/+$/, '');
  const key = JSON.stringify([root, context?.Path, source?.Id, source?.ContentQuery]);
  const [state, setState] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const finish = value => { if (!cancelled) setState({ key, repo, ...value }); };
    if (!source?.Id || !source.ContentQuery || !root) { finish({ error: true, items: [], source: {} }); return; }
    let configuration = source, optedIn = false;
    (async () => {
      const expanded = await loadWithTimeout(repo, { idOrPath: source.Id,
        oDataOptions: { select: 'all', expand: roleFields, metadata: 'no' } }, controller.signal);
      if (!expanded?.d) throw Error('Incomplete magazine configuration');
      configuration = expanded.d;
      const editorialRoot = oneReference(configuration.EditorialRoot);
      optedIn = !!editorialRoot || !!configuration.EditorialRoot?.__deferred;
      const catalogueSource = optedIn ? { ...configuration,
        ContentQuery: editorialCatalogueQuery(configuration.ContentQuery) } : configuration;
      const items = await loadMagazineCatalogue(repo, catalogueSource, controller.signal, root);
      if (!optedIn) return finish({ items, source: configuration, editorial: null });
      const articles = publishedItems(items, root);
      const data = await loadEditorialData(repo, { root, editorialRoot, articles,
        categories: items.filter(item => item.Type === 'LeisureCategory'),
        pages: items.filter(item => ['Page', 'SmartFolder'].includes(item.Type)) }, controller.signal);
      const editorial = createEditorialLayer({ ...data, root, editorialRoot: editorialRoot?.Path, articles });
      if (editorial.error) throw Error('Invalid editorial catalogue');
      finish({ items: [...items, ...data.annotations], source: configuration, editorial });
    })().catch(() => finish({ error: true, items: [], source: configuration,
      editorial: optedIn ? createEditorialLayer({ root }) : null }));
    return () => { cancelled = true; controller.abort(); };
  }, [key, repo, root, source]);
  const ready = state?.key === key && state?.repo === repo;
  const items = ready ? state.items : [];
  const expanded = ready ? state.source : {};
  const newsRoot = oneReference(expanded.NewsRoot)?.Path;
  const articles = publishedItems(items, root);
  const configuredCategories = references(expanded.CategoryRoots);
  const categories = publicCategories(expanded, root);
  const value = { context, source: expanded, root, items, loading: !ready, error: ready && state.error,
    editorial: ready ? state.editorial || null : null,
    annotations: items.filter(item => item.Type === 'EditorialAnnotation' && !isHidden(item)),
    categories,
    articles, stories: articles.filter(item => (!newsRoot || !item.Path.startsWith(newsRoot + '/')) &&
      (!configuredCategories.length || categories.some(category => item.Path.startsWith(category.Path + '/')))),
    routeFor: role => contentRoute(oneReference(expanded[role])) };
  return <MagazineContext.Provider value={value}>{children}</MagazineContext.Provider>;
}
