import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useRepository } from '@sensenet/hooks-react';
import { contentRoute, plainText, plainParagraphs, references, publishedDate, useEditorialContent, isHidden } from '../editorial/repository';
import { useMagazine, oneReference, magazineReferences, loadMagazineCatalogue } from './provider';
import { annotationFor, seriesName, sequenceNumber, categoryFor, groupByYear, seriesGroups, publishedItems, seriesNeighbours, orderItems } from './model';
import { Heading, Status, SmartLink, Cover, Card, Metadata, Breadcrumb, PageHeading, categoryColour } from './primitives';
import { articleBody, safeLink } from './body';
import DisqusCommentsWidget from '../widgets/manual-plugin-disqus';
import { publicationTime } from '../../page-meta';
import { MagazineBrand } from './branding';
import { createPortal } from 'react-dom';
import { initialReaderHeader } from './initial-header';
import { EditorialCategory, EditorialHub, EditorialCollections, EditorialArticleContext, nativeCollectionDirectories } from './editorial-sections';
import { RelatedLinks } from '../editorial/related-links';
import { magazineSettings } from './settings';

export function MagazineNavigation(props) {
  const data = useEditorialContent(props, true);
  const { context, routeFor, root } = useMagazine();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const footer = props.widget.PortletZone === 'footer';
  const brand = context?.Workspace?.DisplayName || context?.DisplayName;
  useEffect(() => { setOpen(false); }, [location.pathname]);
  const links = data.items.filter(item => safeLink(item.Url));
  const list = <ul className={footer ? 'rm-footer-links' : 'rm-nav-list'}>{links.map(item => <li key={item.Id}>
    <SmartLink href={item.Url} aria-current={item.Url === location.pathname ? 'page' : undefined}>{plainText(item.DisplayName)}</SmartLink>
  </li>)}</ul>;
  if (footer) return <nav aria-label={plainText(props.widget.Title)}><h2>{plainText(props.widget.Title)}</h2>{list}<Status {...data} /></nav>;
  const navigation = <>
    <div className="rm-nav-actions">{routeFor('SearchPage') && <Link className="rm-search-link" to={routeFor('SearchPage')}>Keresés</Link>}
    <button className="rm-menu-toggle" type="button" aria-expanded={open} aria-controls="reader-navigation" onClick={() => setOpen(value => !value)}>Menü</button></div>
    <nav id="reader-navigation" className="rm-primary-nav" data-open={open} aria-label={plainText(props.widget.Title) || 'Főmenü'}>{list}<Status {...data} /></nav>
  </>;
  const slot = initialReaderHeader(root)?.querySelector('[data-sn-initial-navigation]');
  if (slot) return createPortal(navigation, slot);
  return <div className="rm-navigation"><Link className="rm-brand" to="/"><MagazineBrand name={brand} /></Link>{navigation}</div>;
}

export function MagazineIdentity({ widget }) {
  return <section className="rm-identity"><h1>{plainText(widget.Title)}</h1>
    {plainParagraphs(widget.ComponentContent).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    <a className="rm-identity-action" href="#start-here">Kezdd itt ↓</a></section>;
}

export function MagazineLatest(props) {
  const state = useEditorialContent(props, true);
  const { annotations, routeFor, stories: articles } = useMagazine();
  const ids = new Set(state.items.map(item => item.Id));
  const byId = new Map(articles.map(item => [item.Id, item]));
  const selected = state.items.filter(item => ids.has(item.Id)).map(item => byId.get(item.Id)).filter(Boolean);
  const featured = selected.find(item => annotationFor(item, annotations)?.Featured) || selected[0];
  return <section className="rm-section rm-latest"><Heading widget={props.widget} /><Status {...state} empty={!selected.length} />
    {featured && <Card item={featured} featured />}
    <div className="rm-grid">{selected.filter(item => item.Id !== featured?.Id).map(item => <Card key={item.Id} item={item} />)}</div>
    {routeFor('ArchivePage') && <Link className="rm-action" to={routeFor('ArchivePage')}>Összes írás időrendben →</Link>}
  </section>;
}

export function MagazineNews({ widget }) {
  const { articles, source, loading, error } = useMagazine();
  const news = oneReference(source.NewsRoot);
  const root = isHidden(news) ? '' : news?.Path;
  const days = Number(source.NewsWindowDays) > 0 ? Number(source.NewsWindowDays) : 30;
  const now = Date.now();
  const items = articles.filter(item => root && item.Path.startsWith(root + '/') && publicationTime(item.PublishDate) !== null && now - publicationTime(item.PublishDate) < days * 86400000);
  if (loading || error || !items.length) return null;
  return <section className="rm-section rm-news"><Heading widget={widget} /><div className="rm-compact-grid">{items.slice(0, 3).map(item => <Card key={item.Id} item={item} compact />)}</div></section>;
}

export function MagazineStart({ widget }) {
  const { items, annotations, articles, stories, loading, error } = useMagazine();
  const selected = annotations.filter(item => item.StartHere).sort((a, b) => (a.Index || 0) - (b.Index || 0))
    .map(annotation => { const reference = oneReference(annotation.Target); return { annotation, target: items.find(item => item.Id === reference?.Id) || reference }; })
    .filter(({ target }) => target && !isHidden(target) && contentRoute(target) &&
      (!/^Leisure(?:Article|.*Review)$/.test(target.Type || '') || (articles || stories || []).some(item => item.Id === target.Id)));
  return <section id="start-here" className="rm-section"><Heading widget={widget} /><Status loading={loading} error={error} empty={!selected.length} />
    <div className="rm-start-grid">{selected.map(({ annotation, target }) => {
      const full = items.find(item => item.Id === target.Id) || target;
      return <Link className="rm-start-tile" key={annotation.Id} to={contentRoute(full)}><h3>{plainText(annotation.DisplayName) || plainText(full.DisplayName)}</h3>
        {plainText(annotation.Description) && <p>{plainText(annotation.Description)}</p>}<span aria-hidden="true">→</span></Link>;
    })}</div></section>;
}

export function MagazineCategoryPreview(props) {
  const { stories, categories, annotations, loading, error } = useMagazine();
  const category = oneReference(props.widget.CustomRoot);
  const items = stories.filter(item => category && categoryFor(item, categories)?.Id === category.Id);
  return <section className="rm-section" style={{ '--rm-category': categoryColour(category, annotations) }}><Heading widget={props.widget} /><Status loading={loading} error={error} empty={!items.length} />
    <div className="rm-grid">{items.slice(0, 3).map(item => <Card key={item.Id} item={item} />)}</div>
    {category && <Link className="rm-action" to={contentRoute(category)}>Mind a {items.length} írás →</Link>}</section>;
}

export function MagazineAbout({ widget }) {
  const { routeFor } = useMagazine();
  return <section className="rm-section rm-about"><Heading widget={widget} />{plainParagraphs(widget.ComponentContent).map((text, index) => <p key={index}>{text}</p>)}
    {routeFor('AboutPage') && <Link className="rm-action" to={routeFor('AboutPage')}>Rólam →</Link>}</section>;
}

export function MagazineCategory({ books = false }) {
  const { editorial, loading, error, context } = useMagazine();
  if (loading) return <section className="rm-section"><PageHeading context={context} /><Status loading error={error} /></section>;
  return editorial ? <EditorialCategory books={books} /> : <LegacyMagazineCategory books={books} />;
}

function LegacyMagazineCategory({ books = false }) {
  const { context, stories, articles, source, annotations, loading, error } = useMagazine();
  const [sort, setSort] = useState('latest');
  const [mode, setMode] = useState(magazineSettings(source).defaultBrowseView === 'collections' ? 'publisher' : 'publication');
  const pool = oneReference(source?.NewsRoot)?.Path === context.Path ? articles : stories;
  const items = (pool || []).filter(item => item.Path.startsWith(context.Path + '/'));
  const groups = new Map();
  for (const item of items) {
    const name = plainText(annotationFor(item, annotations)?.PublisherGroup) || seriesName(item, annotations) || 'További írások';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const sortItems = value => [...value].sort(sort === 'title' ? (a, b) => plainText(a.DisplayName).localeCompare(plainText(b.DisplayName), 'hu') : (a, b) => Date.parse(b.PublishDate) - Date.parse(a.PublishDate));
  const render = (values, key, preserveOrder = false) => <div key={key} className={books ? 'rm-books' : 'rm-grid'}>{(preserveOrder ? values : sortItems(values)).map(item => <Card key={item.Id} item={item} book={books} />)}</div>;
  return <section className="rm-section"><PageHeading context={context} /><Status loading={loading} error={error} empty={!items.length} />
    <div className="rm-toolbar">{books && <label>Nézet <select className="rm-select" value={mode} onChange={event => setMode(event.target.value)}>
      <option value="publisher">Kiadói sorozatok</option><option value="publication">Megjelenés az oldalon</option><option value="original">Eredeti sorszám</option><option value="timeline">Világon belüli időrend</option>
    </select></label>}<label>Rendezés <select className="rm-select" value={sort} onChange={event => setSort(event.target.value)}><option value="latest">Legújabb</option><option value="title">Cím</option></select></label></div>
    {books && mode === 'publisher' ? <><div className="rm-chips">{[...groups].map(([name, values], index) => <a className="rm-chip" key={name} href={'#group-' + index}>{name} ({values.length})</a>)}</div>
      {[...groups].map(([name, values], index) => { const ordered = orderItems(values, annotations, 'publisher', sort); return <section className="rm-section" id={'group-' + index} key={name}>
        <h2 className="rm-section-heading">{name}</h2>
        {render(ordered.placed, name, true)}{ordered.unplaced.length > 0 && <div className="rm-unplaced"><h3>Ebben a sorrendben nincs besorolva</h3>{render(ordered.unplaced, name + '-unplaced', true)}</div>}
      </section>; })}</> :
      books && mode !== 'publication' ? (() => { const ordered = orderItems(items, annotations, mode, sort); return <>
        {render(ordered.placed, 'placed', true)}{ordered.unplaced.length > 0 && <section className="rm-unplaced"><h2>Ebben a sorrendben nincs besorolva</h2>{render(ordered.unplaced, 'unplaced', true)}</section>}</>; })() : render(items, 'all')}
  </section>;
}
export const MagazineBooks = () => <MagazineCategory books />;

export function MagazineArchive() {
  const { context, stories, categories, loading, error } = useMagazine();
  const [filter, setFilter] = useState('');
  const [parameters, setParameters] = useSearchParams();
  const requestedYear = parameters.get('year') || '';
  const yearFilter = /^[1-9]\d{3}$/.test(requestedYear) ? requestedYear : '';
  const pool = filter ? stories.filter(item => categoryFor(item, categories)?.Path === filter) : stories;
  const availableYears = groupByYear(pool);
  const years = yearFilter ? availableYears.filter(group => String(group.year) === yearFilter) : availableYears;
  const selectYear = year => {
    const next = new URLSearchParams(parameters);
    if (year) next.set('year', year); else next.delete('year');
    setParameters(next);
  };
  return <section className="rm-section rm-archive"><PageHeading context={context} /><Status loading={loading} error={error} empty={!years.length} />
    <div className="rm-chips" aria-label="Rovatszűrő"><button className="rm-chip" type="button" aria-pressed={!filter} onClick={() => setFilter('')}>Összes ({stories.length})</button>
      {categories.map(category => <button className="rm-chip" key={category.Id} type="button" aria-pressed={filter === category.Path} onClick={() => setFilter(category.Path)}>{plainText(category.DisplayName)} ({stories.filter(item => categoryFor(item, categories)?.Id === category.Id).length})</button>)}</div>
    <nav className="rm-chips" aria-label="Évek"><button className="rm-chip" type="button" aria-pressed={!yearFilter} onClick={() => selectYear('')}>Minden év</button>
      {availableYears.map(({ year }) => <button className="rm-chip" type="button" key={year} aria-pressed={String(year) === yearFilter} onClick={() => selectYear(String(year))}>{year}</button>)}</nav>
    {years.map(({ year, items: entries }) => <section className="rm-year" id={'year-' + year} key={year}><h2 className="rm-section-heading">{year} <small>({entries.length})</small></h2>
      <ol className="rm-archive-list">{entries.map(item => <li className="rm-archive-item" key={item.Id}><Metadata item={item} /><div className="rm-archive-content"><h3 className="rm-title"><Link to={contentRoute(item)}>{plainText(item.DisplayName)}</Link></h3>
        {plainText(item.Description) && <p className="rm-excerpt">{plainText(item.Description)}</p>}</div></li>)}</ol></section>)}
  </section>;
}

function useCurrentCollection() {
  const repo = useRepository();
  const { context, root, articles } = useMagazine();
  const key = JSON.stringify([context.Path, context.Query]);
  const [state, setState] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); let cancelled = false;
    if (!context.Query) { setState({ key, ids: [] }); return () => controller.abort(); }
    loadMagazineCatalogue(repo, { ContentQuery: context.Query }, controller.signal, root)
      .then(items => { if (!cancelled) setState({ key, ids: items.map(item => item.Id) }); })
      .catch(() => { if (!cancelled) setState({ key, ids: [], error: true }); });
    return () => { cancelled = true; controller.abort(); };
  }, [repo, key, root, context.Query]);
  return { loading: state?.key !== key, error: state?.key === key && state.error,
    items: state?.key === key ? articles.filter(item => state.ids.includes(item.Id)) : [] };
}

export function MagazineHub() {
  const { editorial, loading, error, context } = useMagazine();
  if (loading) return <section className="rm-section"><PageHeading context={context} /><Status loading error={error} /></section>;
  return editorial ? (editorial.hubForPage(context) ? <EditorialHub /> : <MagazineQueryCollection />) : <LegacyMagazineHub />;
}

// Ordinary native query pages (for example an author page) remain review lists.
// Only an explicit HubPage relation opts a page into bibliographic ordering.
function MagazineQueryCollection() {
  const { context, error } = useMagazine();
  const state = useCurrentCollection();
  return <section className="rm-section"><PageHeading context={context} />
    <Status {...state} error={error || state.error} empty={!state.items.length} />
    {!error && !state.error && !state.loading && <><p>{state.items.length} ismertető</p><div className="rm-grid">{state.items.map(item => <Card key={item.Id} item={item} />)}</div></>}
  </section>;
}

function LegacyMagazineHub() {
  const { context, annotations, source } = useMagazine();
  const state = useCurrentCollection();
  const configuredDefault = magazineSettings(source).defaultBrowseView;
  const [mode, setMode] = useState(configuredDefault === 'collections' ? 'default' : 'publication');
  useEffect(() => setMode(configuredDefault === 'collections' ? 'default' : 'publication'), [context.Path, configuredDefault]);
  const placeholders = annotations.filter(annotation => !oneReference(annotation.Target) && plainText(annotation.Series) === plainText(context.DisplayName));
  const field = { publisher: 'PublisherSequence', original: 'OriginalSequence', timeline: 'TimelineSequence' }[mode] || 'SequenceNumber';
  const positive = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const entries = [...state.items.map(item => ({ item, placeholder: false, number: mode === 'publication' ? null : sequenceNumber(item, annotations, mode) })),
    ...placeholders.map(item => ({ item, placeholder: true, number: mode === 'publication' ? null : positive(item[field]) }))];
  const placed = entries.filter(entry => mode === 'publication' ? !entry.placeholder : entry.number !== null)
    .sort((a, b) => mode === 'publication' ? Date.parse(b.item.PublishDate) - Date.parse(a.item.PublishDate) : a.number - b.number || plainText(a.item.DisplayName).localeCompare(plainText(b.item.DisplayName), 'hu'));
  const unplaced = entries.filter(entry => mode === 'publication' ? entry.placeholder : entry.number === null);
  const row = ({ item, number, placeholder }) => <li className="rm-series-row" key={item.Id}><span className="rm-series-number">{number || '—'}</span>
    {placeholder ? <span>{plainText(item.DisplayName)}</span> : <Link to={contentRoute(item)}>{plainText(item.DisplayName)}</Link>}
    <span>{plainText((placeholder ? item : annotationFor(item, annotations))?.PublisherGroup)}</span><span className="rm-series-status">{placeholder ? 'Még nincs ismertető' : 'Van ismertető'}</span></li>;
  return <section className="rm-section"><PageHeading context={context} /><Status {...state} empty={!state.items.length && !placeholders.length} />
    <label className="rm-toolbar">Sorrend <select className="rm-select" value={mode} onChange={event => setMode(event.target.value)}><option value="default">Sorozat sorrendje</option><option value="publication">Megjelenés az oldalon</option><option value="publisher">Kiadói sorszám</option><option value="original">Eredeti sorszám</option><option value="timeline">Világon belüli időrend</option></select></label>
    <ol className="rm-series-list">{placed.map(row)}</ol>
    {unplaced.length > 0 && <section className="rm-unplaced"><h2>Ebben a sorrendben nincs besorolva</h2><ol className="rm-series-list">{unplaced.map(row)}</ol></section>}
  </section>;
}

export function MagazineCollections() {
  const { editorial, loading, error, context } = useMagazine();
  if (loading) return <section className="rm-section"><PageHeading context={context} /><Status loading error={error} /></section>;
  return editorial ? <EditorialCollections /> : <LegacyMagazineCollections />;
}

function LegacyMagazineCollections() {
  const state = useMagazine();
  const { context, stories, annotations, loading, error, routeFor } = state;
  const series = seriesGroups(stories, annotations);
  const directories = nativeCollectionDirectories(state);
  return <section className="rm-section"><PageHeading context={context} /><Status loading={loading} error={error} />
    {series.map(group => <section className="rm-section" key={group.name}><h2 className="rm-section-heading">{group.name}</h2>
      <div className="rm-grid">{group.items.map(item => <Card key={item.Id} item={item} />)}</div></section>)}
    {directories.map(({ directory, pages }) => <section className="rm-section" key={directory.Id}><h2 className="rm-section-heading">{plainText(directory.DisplayName)}</h2>
      <div className="rm-start-grid">{pages.map(page => <article className="rm-start-tile" key={page.Id}><h3><Link to={contentRoute(page)}>{plainText(page.DisplayName)}</Link></h3>
        {plainText(page.Description) && <p>{plainText(page.Description)}</p>}</article>)}</div></section>)}
    {!series.length && !directories.length && !loading && <p>Ahogy gyarapodnak a történetek közötti kapcsolatok, itt is új bejáratok nyílnak.</p>}
    {routeFor('ArchivePage') && <Link className="rm-action" to={routeFor('ArchivePage')}>Minden írás időrendben →</Link>}</section>;
}

export function MagazineSearch() {
  const { context, stories, editorial, loading, error } = useMagazine();
  const [text, setText] = useState('');
  const term = text.trim().toLocaleLowerCase('hu');
  const result = term.length < 2 ? [] : stories.filter(item => [item.DisplayName, item.Subtitle, item.Description,
    ...(editorial ? editorial.collectionsForArticle(item).map(collection => collection.DisplayName) : [item.Series]),
    ...magazineReferences(item.BookAuthor).map(author => author.DisplayName)].some(value => plainText(value).toLocaleLowerCase('hu').includes(term)));
  return <section className="rm-section"><PageHeading context={context} /><label>Mit keresel?<input className="rm-search-field" type="search" value={text} onChange={event => setText(event.target.value)} placeholder="Cím, szerző, történet…" /></label>
    <Status loading={loading} error={error} />{term.length > 1 && <p role="status">{result.length} találat</p>}<div className="rm-grid">{result.map(item => <Card key={item.Id} item={item} />)}</div></section>;
}

export function editorialRecommendations(current, articles, editorial, source) {
  const settings = magazineSettings(source);
  if (settings.recommendationMode === 'none' || settings.recommendationCount === 0) return [];
  const collectionsFor = article => editorial?.collectionsForArticle(article) || [];
  const collections = new Set(collectionsFor(current).map(item => String(item.Id)));
  const tags = value => (Array.isArray(value.Tags) ? value.Tags : String(value.Tags || '').split(/[,;]/))
    .map(tag => plainText(tag).trim().toLocaleLowerCase('hu')).filter(Boolean);
  const currentTags = new Set(tags(current));
  return articles.filter(item => item.Id !== current.Id).map(item => ({ item, score:
    (settings.recommendationMode === 'tags' ? 0 : collectionsFor(item).filter(collection => collections.has(String(collection.Id))).length * settings.collectionWeight) +
    tags(item).filter(tag => currentTags.has(tag)).length * settings.tagWeight }))
    .filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || Date.parse(b.item.PublishDate) - Date.parse(a.item.PublishDate))
    .slice(0, settings.recommendationCount).map(entry => entry.item);
}

export function MagazineArticle(props) {
  const state = useMagazine();
  const current = publishedItems([...(state.articles || []), ...(state.stories || [])], state.root || process.env.REACT_APP_DATA_PATH)
    .find(item => item.Id === state.context.Id);
  if (state.loading || state.error) return <Status loading={state.loading} error={state.error} />;
  if (!current) return <section className="rm-section"><h1>Az ismertető nem érhető el</h1><Link to="/">Főoldal</Link></section>;
  return <MagazineArticleContent {...props} current={current} />;
}

function MagazineArticleContent({ current, ...props }) {
  const { stories, categories, annotations, routeFor, editorial, source } = useMagazine();
  const settings = magazineSettings(source);
  const category = categoryFor(current, categories);
  const neighbours = editorial ? {} : seriesNeighbours(current, stories, annotations);
  const related = editorialRecommendations(current, stories, editorial, source);
  const shown = new Set([current.Id, ...related.map(item => item.Id), neighbours.previous?.Id, neighbours.next?.Id]);
  const latest = stories.filter(item => categoryFor(item, categories)?.Id === category?.Id && !shown.has(item.Id)).slice(0, 3);
  const [comments, setComments] = useState(false);
  const date = publishedDate(current.PublishDate);
  const authors = magazineReferences(current.BookAuthor);
  const body = useMemo(() => articleBody(current.Body), [current.Body]);
  const lead = plainText(current.Lead) || plainText(current.Description);
  return <article className="rm-article"><Breadcrumb current={current} category={category} />
    <header className="rm-article-header"><Cover item={current} className="rm-article-cover" /><div><h1>{plainText(current.DisplayName)}</h1>
      {plainText(current.Subtitle) && <p className="rm-subtitle">{plainText(current.Subtitle)}</p>}
      <div className="rm-meta">{category && <Link to={contentRoute(category)}>{plainText(category.DisplayName)}</Link>}
        {date && (routeFor('ArchivePage') && stories.some(item => item.Id === current.Id) ? <Link to={routeFor('ArchivePage') + '?year=' + new Date(current.PublishDate).getUTCFullYear()}>{date.label}</Link> : <time dateTime={date.value}>{date.label}</time>)}
        {plainText(current.Author) && <span>Írta: {plainText(current.Author)}</span>}
        {authors.map(author => <span key={author.Id}>{plainText(author.DisplayName)}</span>)}
        {plainText(current.Publisher) && <span>Az írás forrása: {plainText(current.Publisher)}</span>}</div></div></header>
    {lead && <p className="rm-description">{lead}</p>}<div className="rm-article-body" dangerouslySetInnerHTML={{ __html: body }} />
    {editorial && <EditorialArticleContext article={current} />}
    {neighbours.series && <aside className="rm-series-box"><h2>{neighbours.series}</h2><p>{neighbours.position ? `${neighbours.position} / ${neighbours.total}` : `${neighbours.total} ismertető`}</p>
      <div className="rm-series-neighbours">{neighbours.previous && <Link to={contentRoute(neighbours.previous)}>← {plainText(neighbours.previous.DisplayName)}</Link>}{neighbours.next && <Link to={contentRoute(neighbours.next)}>{plainText(neighbours.next.DisplayName)} →</Link>}</div>
      </aside>}
    {related.length > 0 && <section className="rm-section"><h2 className="rm-section-heading">Ha ez tetszett</h2>
      <p className="rm-description">{settings.recommendationMode === 'tags' || settings.collectionWeight === 0 ? 'További írások közös témacímkék alapján.' : settings.tagWeight === 0 ? 'További írások kapcsolódó gyűjtemények alapján.' : 'További írások kapcsolódó gyűjtemények és témacímkék alapján.'}</p>
      <div className="rm-compact-grid">{related.map(item => <Card key={item.Id} item={item} compact />)}</div></section>}
    {references(current.RelatedContent).length > 0 && <details className="rm-details"><summary>Kapcsolódó linkek</summary><RelatedLinks items={current.RelatedContent} /></details>}
    <details className="rm-details" onToggle={event => setComments(event.currentTarget.open)}><summary>Hozzászólások</summary>
      {comments && (process.env.REACT_APP_DISQUS_SHORTNAME ? <DisqusCommentsWidget {...props} /> : <p>A hozzászólások jelenleg nem érhetők el.</p>)}</details>
    {latest.length > 0 && <section className="rm-section"><h2 className="rm-section-heading">Legfrissebb a rovatban</h2><div className="rm-grid">{latest.map(item => <Card key={item.Id} item={item} />)}</div></section>}
  </article>;
}

export function MagazineText() {
  const { context } = useMagazine();
  return <article className="rm-article"><PageHeading context={context} /><div className="rm-article-body" dangerouslySetInnerHTML={{ __html: articleBody(context.Body || context.Lead) }} /></article>;
}
