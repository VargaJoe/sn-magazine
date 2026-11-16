import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { contentRoute, plainText, references, repositoryPath, isHidden } from '../editorial/repository';
import { publicationTime } from '../../page-meta';
import { publishedItems } from './model';
import { useMagazine } from './provider';
import { Card, PageHeading, Status } from './primitives';
import { magazineSettings } from './settings';

const collator = new Intl.Collator('hu', { sensitivity: 'base', numeric: true });
const keyOf = node => node?.Id != null ? String(node.Id) : repositoryPath(node?.Path);
const nameOf = node => plainText(node?.DisplayName || node?.Title || node?.Name);
const refs = value => references(value).length ? references(value) : value?.Path && !value.__deferred ? [value] : [];
const parentOf = (collection, layer) => layer.collections.find(node => refs(collection.ParentCollection)
  .some(parent => keyOf(parent) === keyOf(node))) || null;
function descendantsOf(collection, layer) {
  const children = new Map();
  layer.collections.forEach(node => {
    const parent = refs(node.ParentCollection)[0];
    if (parent) children.set(keyOf(parent), [...(children.get(keyOf(parent)) || []), node]);
  });
  const visit = node => (children.get(keyOf(node)) || []).slice()
    .sort((a, b) => collator.compare(nameOf(a), nameOf(b)) || collator.compare(keyOf(a), keyOf(b)))
    .flatMap(child => [child, ...visit(child)]);
  return visit(collection);
}
const rootOf = (collection, layer) => {
  let current = collection;
  while (parentOf(current, layer)) current = parentOf(current, layer);
  return current;
};
const ownCollectionsRoute = state => state.routeFor?.('CollectionsPage') || '';
export function collectionRoute(collection, state) {
  const page = refs(collection.HubPage).find(node => contentRoute(node, state.root));
  return page ? contentRoute(page, state.root) : '';
}
const sorted = (values, sort) => values.slice().sort(sort === 'title' ? (a, b) => collator.compare(nameOf(a), nameOf(b)) :
  (a, b) => (sort === 'oldest' ? 1 : -1) * (publicationTime(a.PublishDate) - publicationTime(b.PublishDate)) || collator.compare(keyOf(a), keyOf(b)));
function Counts({ reviews, items }) {
  return <p className="rm-editorial-counts"><span>{reviews} ismertető</span><span>{items} nyilvántartott tétel</span></p>;
}
function SortControl({ value, onChange }) {
  return <label>Rendezés <select className="rm-select" value={value} onChange={event => onChange(event.target.value)}>
    <option value="latest">Legújabb</option><option value="oldest">Legrégebbi</option><option value="title">Cím</option>
  </select></label>;
}
const mediaNames = { book: 'Könyv', gamebook: 'Lapozgatós könyv', film: 'Film', tvseries: 'Tévésorozat', manga: 'Manga', comic: 'Képregény', game: 'Játék', other: 'Egyéb' };
function Bibliography({ item }) {
  const labels = [['EditionLabel', 'Kiadás'], ['PublisherLabel', 'Kiadó'], ['ImprintLabel', 'Kiadói márka'],
    ['DistributorLabel', 'Forgalmazó'], ['StudioLabel', 'Stúdió']].filter(([field]) => plainText(item[field]));
  return <>{mediaNames[item.MediaKind] && <p className="rm-editorial-kind">{mediaNames[item.MediaKind]}</p>}
    {labels.length > 0 && <dl className="rm-editorial-bibliography">{labels.map(([field, label]) =>
      <React.Fragment key={field}><dt>{label}</dt><dd>{plainText(item[field])}</dd></React.Fragment>)}</dl>}</>;
}
function ReviewLinks({ reviews, root }) {
  const visible = reviews.filter(review => contentRoute(review, root));
  return visible.length ? <ul className="rm-editorial-review-links">{visible.map(review =>
    <li key={keyOf(review)}><Link to={contentRoute(review, root)}>{nameOf(review)}</Link></li>)}</ul> :
    <p className="rm-series-status">Még nincs ismertető</p>;
}
function ItemRow({ row, root, numbered = false }) {
  return <li className={'rm-editorial-item' + (numbered ? ' rm-editorial-item-numbered' : '')} data-editorial-item={keyOf(row.item)}>
    {numbered && <span className="rm-editorial-number" aria-label={row.numberLabel ? undefined : 'Számozás nem ismert'}>{row.numberLabel || '—'}</span>}
    <div className="rm-editorial-item-body"><h3>{nameOf(row.item)}</h3><Bibliography item={row.item} />
      <ReviewLinks reviews={row.reviews} root={root} /></div>
  </li>;
}
function Conflict({ conflicts }) {
  return conflicts.length ? <p className="rm-editorial-conflict" role="status">A kiválasztott sorrendben több tétel azonos helyen szerepel.</p> : null;
}
function CollectionContents({ hub, initialCollection }) {
  const state = useMagazine();
  const navigate = useNavigate();
  const [choice, setChoice] = useState('');
  const [sort, setSort] = useState('latest');
  const layer = state.editorial;
  const hubView = layer.collectionView(hub);
  const available = [hub, ...descendantsOf(hub, layer)];
  const fallback = initialCollection || hubView.children[0] || hub;
  const configuredDefault = magazineSettings(state.source).defaultBrowseView;
  const explicitOrder = initialCollection && keyOf(initialCollection) !== keyOf(hub);
  const wanted = choice || (explicitOrder || configuredDefault === 'collections' ? keyOf(fallback) : 'publication');
  const publication = wanted === 'publication';
  const selected = available.find(node => keyOf(node) === wanted) || fallback;
  useEffect(() => { setChoice(''); }, [state.context.Path, configuredDefault, hub.Id, hub.Path]);
  const view = layer.collectionView(selected, { hub: keyOf(hub), sort, mode: publication ? 'publication' : 'order' });
  const manual = selected.OrderMode === 'manual';
  const rows = manual ? view.placed : view.rows;
  return <div className="rm-editorial-collection">
    <Counts reviews={view.totalReviews} items={view.totalItems} />
    <div className="rm-toolbar"><label>Sorrend <select className="rm-select" value={publication ? 'publication' : keyOf(selected)} onChange={event => {
      const value = event.target.value;
      const target = available.find(node => keyOf(node) === value);
      const href = target && collectionRoute(target, state);
      if (href && refs(target.HubPage)[0]?.Path !== state.context.Path) navigate(href);
      else setChoice(value);
    }}>
      {available.map(node => <option key={keyOf(node)} value={keyOf(node)}>{node === hub && node.OrderMode !== 'manual' ? 'Összes nyilvántartott tétel' : nameOf(node)}</option>)}
      <option value="publication">Megjelenés az oldalon</option>
    </select></label><SortControl value={sort} onChange={setSort} /></div>
    {publication ? <><p className="rm-description">Az oldalon megjelent ismertetők.</p><Status empty={!view.reviews.length} />
      <div className="rm-grid">{view.reviews.map(review => <Card key={keyOf(review)} item={review} />)}</div></> : <>
      <Conflict conflicts={view.conflicts} />
      {!view.totalItems && <p className="rm-status">Még nincs listázható tétel ebben a gyűjteményben.</p>}
      <ul className="rm-editorial-item-list">{rows.map(row => <ItemRow key={keyOf(row.item)} row={row} root={state.root} numbered={manual} />)}</ul>
      {manual && view.unplaced.length > 0 && <section className="rm-unplaced"><h2>Ebben a sorrendben nincs besorolva</h2>
        <ul className="rm-editorial-item-list">{view.unplaced.map(row => <ItemRow key={keyOf(row.item)} row={row} root={state.root} numbered />)}</ul></section>}
    </>}
  </div>;
}

function publicStories(state) {
  const newsPath = repositoryPath(refs(state.source?.NewsRoot)[0]?.Path);
  return publishedItems(state.stories || state.articles || [], state.root).filter(article => !newsPath || !article.Path.startsWith(`${newsPath}/`));
}

export function EditorialCategory({ books = false }) {
  const state = useMagazine();
  const configuredDefault = magazineSettings(state.source).defaultBrowseView;
  const [mode, setMode] = useState(configuredDefault === 'collections' ? 'groups' : 'publication');
  const [sort, setSort] = useState('latest');
  useEffect(() => setMode(configuredDefault === 'collections' ? 'groups' : 'publication'), [state.context.Path, configuredDefault]);
  if (!state.editorial) return null;
  const { editorial: layer, context, loading, error } = state;
  const categoryPath = repositoryPath(context.Path);
  const validContext = !!contentRoute(context, state.root);
  const newsPath = repositoryPath(refs(state.source?.NewsRoot)[0]?.Path);
  const pool = newsPath === categoryPath ? publishedItems(state.articles || [], state.root) : publicStories(state);
  const items = validContext ? pool.filter(article => article.Path.startsWith(`${categoryPath}/`)) : [];
  const grouped = layer.groupsForArticles(items);
  const cards = values => <div className={books ? 'rm-books' : 'rm-grid'}>{sorted(values, sort).map(article => <Card key={keyOf(article)} item={article} book={books} />)}</div>;
  return <section className="rm-section rm-editorial-category"><PageHeading context={context} /><Status loading={loading} error={error || layer.error || !validContext} empty={!items.length} />
    {!loading && !error && !layer.error && validContext && <><div className="rm-toolbar"><label>Nézet <select className="rm-select" value={mode} onChange={event => setMode(event.target.value)}>
      <option value="groups">Gyűjtemények szerint</option><option value="publication">Megjelenés az oldalon</option>
    </select></label><SortControl value={sort} onChange={setSort} /></div>
      {mode === 'publication' ? cards(items) : <>{grouped.groups.map(group => {
        const href = collectionRoute(group.collection, state);
        return <section className="rm-section" key={keyOf(group.collection)}><h2 className="rm-section-heading">{href ? <Link to={href}>{group.name}</Link> : group.name}</h2>
          <Counts reviews={group.totalReviews} items={group.totalItems} />{cards(group.items)}</section>;
      })}{grouped.ungrouped.length > 0 && <section className="rm-section"><h2 className="rm-section-heading">További írások</h2>{cards(grouped.ungrouped)}</section>}</>}
    </>}
  </section>;
}

export function EditorialHub() {
  const state = useMagazine();
  if (!state.editorial) return null;
  const { editorial: layer, context, loading, error } = state;
  const hub = layer.hubForPage(context);
  return <section className="rm-section rm-editorial-hub"><PageHeading context={context} /><Status loading={loading} error={error || layer.error} />
    {!loading && !error && !layer.error && (hub ? <CollectionContents hub={rootOf(hub, layer)} initialCollection={hub} /> :
      <p className="rm-status">Ehhez az oldalhoz még nincs listázható gyűjtemény.</p>)}
  </section>;
}

const publicNavigation = (node, root) => node && !isHidden(node) && !!contentRoute(node, root) &&
  !repositoryPath(node.Path).split('/').some(part => {
    try { return decodeURIComponent(part).startsWith('('); } catch (_) { return true; }
  });

export function nativeCollectionDirectories(state) {
  return refs(state.source?.CollectionRoots).filter(node => publicNavigation(node, state.root)).map(directory => ({
    directory,
    pages: (state.items || []).filter(node => ['Page', 'SmartFolder', 'LeisureCategory'].includes(node.Type) &&
      publicNavigation(node, state.root) && node.Path.startsWith(directory.Path + '/') &&
      !node.Path.slice(directory.Path.length + 1).includes('/'))
      .sort((a, b) => collator.compare(nameOf(a), nameOf(b))),
  }));
}

export function EditorialCollections() {
  const state = useMagazine();
  if (!state.editorial) return null;
  const { editorial: layer, context, loading, error } = state;
  const ownRoute = ownCollectionsRoute(state);
  const directories = nativeCollectionDirectories(state);
  const currentDirectory = directories.find(group => group.directory.Path === context.Path);
  const directoryPaths = new Set(directories.flatMap(group => group.pages.map(page => page.Path)));
  const roots = currentDirectory ? [] : layer.collections.filter(node => !parentOf(node, layer) &&
    !refs(node.HubPage).some(page => directoryPaths.has(page.Path)));
  const ungrouped = currentDirectory ? [] : layer.ungroupedItems();
  return <section className="rm-section rm-editorial-collections"><PageHeading context={context} /><Status loading={loading} error={error || layer.error} />
    {!loading && !error && !layer.error && <>
      {roots.length > 0 && <><h2 className="rm-section-heading">Gyűjtemények</h2><div className="rm-start-grid">{roots.map(collection => {
        const view = layer.collectionView(collection);
        const href = collectionRoute(collection, state);
        return <article className="rm-start-tile" key={keyOf(collection)}><h3>{href ? <Link to={href}>{nameOf(collection)}</Link> : nameOf(collection)}</h3>
          {collection.Description && <p>{plainText(collection.Description)}</p>}<Counts reviews={view.totalReviews} items={view.totalItems} /></article>;
      })}</div></>}
      {(currentDirectory ? [currentDirectory] : directories).map(({ directory, pages }) => <section className="rm-section" key={keyOf(directory)}>
        {!currentDirectory && <h2 className="rm-section-heading">{nameOf(directory)}</h2>}
        <div className="rm-start-grid">{pages.map(page => {
          const collection = layer.hubForPage(page);
          const view = collection && layer.collectionView(collection);
          return <article className="rm-start-tile" key={keyOf(page)}>
            <h3><Link to={contentRoute(page, state.root)}>{nameOf(page)}</Link></h3>
            {plainText(page.Description) && <p>{plainText(page.Description)}</p>}
            {view && <Counts reviews={view.totalReviews} items={view.totalItems} />}
          </article>;
        })}</div>
      </section>)}
      {ungrouped.length > 0 && <section className="rm-section rm-editorial-ungrouped"><h2 className="rm-section-heading">További művek és kiadások</h2>
        <ul className="rm-editorial-item-list">{ungrouped.map(row => <ItemRow key={keyOf(row.item)} row={row} root={state.root} />)}</ul>
      </section>}
      {!roots.length && !directories.some(group => group.pages.length) && !ungrouped.length && <p className="rm-status">Még nincs listázható gyűjtemény.</p>}
      {currentDirectory && ownRoute && <Link className="rm-action" to={ownRoute}>Minden gyűjtemény →</Link>}
    </>}
  </section>;
}

function Neighbour({ row, label, root }) {
  if (!row) return null;
  return <div><strong>{label}</strong><p>{row.numberLabel && <span>{row.numberLabel} · </span>}{nameOf(row.item)}</p>
    <ReviewLinks reviews={row.reviews} root={root} /></div>;
}
export function EditorialArticleContext({ article }) {
  const state = useMagazine();
  const [choice, setChoice] = useState({ article: '', collection: '' });
  if (!state.editorial) return null;
  const { editorial: layer, loading, error } = state;
  if (loading || error || layer.error) return <Status loading={loading} error={error || layer.error} />;
  const views = layer.itemViewsForArticle(article);
  if (!views.length) return null;
  const directManual = [...new Map(views.flatMap(view => view.collections).filter(entry => entry.collection.OrderMode === 'manual')
    .map(entry => [keyOf(entry.collection), entry.collection])).values()];
  const selected = directManual.find(collection => keyOf(collection) === (choice.article === keyOf(article) ? choice.collection : '')) ||
    (directManual.length === 1 ? directManual[0] : null);
  const neighbours = selected ? layer.neighboursForArticle(article, keyOf(selected)) : null;
  const collections = layer.collectionsForArticle(article);
  return <aside className="rm-series-box rm-editorial-article"><h2>A cikkben bemutatott művek</h2>
    {views.map(view => <section className="rm-editorial-bibliographic-item" key={keyOf(view.item)}><h3>{nameOf(view.item)}</h3><Bibliography item={view.item} />
      {view.collections.filter(entry => entry.numberLabel).map(entry => <p className="rm-editorial-membership-label" key={keyOf(entry.collection)}>
        {nameOf(entry.collection)}: {entry.numberLabel}</p>)}</section>)}
    {collections.length > 0 && <nav className="rm-chips" aria-label="Kapcsolódó gyűjtemények">{collections.map(collection => {
      const href = collectionRoute(collection, state);
      return href ? <Link className="rm-chip" key={keyOf(collection)} to={href}>{nameOf(collection)}</Link> : <span className="rm-chip" key={keyOf(collection)}>{nameOf(collection)}</span>;
    })}</nav>}
    {directManual.length > 1 && <label className="rm-toolbar">Sorrend <select className="rm-select" value={selected ? keyOf(selected) : ''}
      onChange={event => setChoice({ article: keyOf(article), collection: event.target.value })}>
      <option value="">Válassz sorrendet</option>{directManual.map(collection => <option key={keyOf(collection)} value={keyOf(collection)}>{nameOf(collection)}</option>)}
    </select></label>}
    {neighbours && <><Conflict conflicts={neighbours.conflicts} />{neighbours.current ? <>
      <p>{nameOf(selected)}{neighbours.current.numberLabel ? ` · ${neighbours.current.numberLabel}` : ''}</p>
      <nav className="rm-series-neighbours" aria-label="Előző és következő tétel">
        <Neighbour row={neighbours.previous} label="Előző tétel" root={state.root} />
        <Neighbour row={neighbours.next} label="Következő tétel" root={state.root} />
      </nav>
    </> : !neighbours.conflicts.length && <p className="rm-series-status">Ebben a sorrendben még nincs egyértelmű helye az ismertetett tételnek.</p>}</>}
  </aside>;
}
