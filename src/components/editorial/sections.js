import React from 'react';
import { Link } from 'react-router-dom';
import { useSnStore } from '../store/sn-store';
import { plainText, plainParagraphs, contentRoute, repositoryImage, coverUrl, publishedDate,
  firstTranslation, translationTarget, useEditorialContent, isHidden } from './repository';

function SectionHeading({ widget }) {
  const title = plainText(widget?.Title);
  const description = plainText(widget?.ComponentDescription);
  return <>{title && <h2 className="ed-section-heading">{title}</h2>}
    {description && <p className="ed-section-description">{description}</p>}</>;
}

function Status({ state, empty }) {
  if (state.loading) return <p className="ed-status" role="status">Betöltés…</p>;
  if (state.error) return <p className="ed-status" role="status">A tartalom most nem tölthető be.</p>;
  if (empty) return <p className="ed-status">Még nincs megjeleníthető tartalom.</p>;
  return null;
}

function Cover({ item }) {
  const src = coverUrl(item);
  return src ? <img className="ed-cover" src={src} alt="" loading="lazy" /> : null;
}

function DateLabel({ item }) {
  const date = publishedDate(item?.PublishDate);
  return date ? <time className="ed-date" dateTime={date.value}>{date.label}</time> : null;
}

function ArticleText({ item, heading: Heading = 'h3' }) {
  const route = contentRoute(item);
  const title = plainText(item?.DisplayName);
  const subtitle = plainText(item?.Subtitle);
  const excerpt = plainText(item?.Lead) || plainText(item?.Description);
  return <>
    {title && <Heading className="ed-title">{route ? <Link to={route}>{title}</Link> : title}</Heading>}
    {subtitle && <p className="ed-subtitle">{subtitle}</p>}
    <DateLabel item={item} />
    {excerpt && <p className="ed-excerpt">{excerpt}</p>}
  </>;
}

function Actions({ item, reading = false }) {
  const route = contentRoute(item);
  const first = reading ? firstTranslation(item) : null;
  const target = first ? translationTarget(first) : null;
  return <div className="ed-actions">
    {route && <Link className="ed-action" to={route}>{reading ? 'Ismertető' : 'Tovább olvasom'}</Link>}
    {target && (target.external ?
      <a className="ed-action ed-action-reading" href={target.href} target="_blank" rel="noopener noreferrer">{target.label}</a> :
      <Link className="ed-action ed-action-reading" to={target.href}>{target.label}</Link>)}
  </div>;
}

export function EditorialNavigation(props) {
  const state = useEditorialContent(props, true);
  const context = useSnStore(store => store.context);
  const site = context?.Path?.replace(/\/+$/, '') === process.env.REACT_APP_DATA_PATH?.replace(/\/+$/, '') ? context : context?.Workspace;
  const brand = plainText(site?.DisplayName);
  const logoPath = process.env.REACT_APP_LOGO_PATH;
  const logo = logoPath ? repositoryImage(`${process.env.REACT_APP_DATA_PATH}/${logoPath.replace(/^\/+/, '')}`) : '';
  const items = state.items.filter(item => !isHidden(item) && plainText(item.DisplayName) &&
    ((typeof item.DisplayZone?.includes === 'function' && item.DisplayZone.includes('menuitem')) || /Category$/.test(item.Type || '')));
  return <div className="ed-navigation">
    <Link className="ed-brand" to="/" aria-label="Főoldal">
      {logo && <img className="ed-logo" src={logo} alt="" />}{brand && <span>{brand}</span>}
    </Link>
    <nav aria-label={plainText(props.widget?.Title) || 'Rovatok'}>
      <ul className="ed-nav-list">{items.map(item => <li key={item.Id || item.Path}>
        <Link to={contentRoute(item)}>{plainText(item.DisplayName)}</Link>
      </li>)}</ul>
      <Status state={state} />
    </nav>
  </div>;
}

function TextSection({ widget, intro }) {
  const title = plainText(widget?.Title);
  const description = plainText(widget?.ComponentDescription);
  const paragraphs = plainParagraphs(widget?.ComponentContent);
  const Heading = intro ? 'h1' : 'h2';
  return <section className={`ed-section ${intro ? 'ed-intro' : 'ed-note'}`}>
    {title && <Heading>{title}</Heading>}
    {description && <p className="ed-section-description">{description}</p>}
    {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
  </section>;
}
export const EditorialIntro = props => <TextSection widget={props.widget} intro />;
export const EditorialNote = props => <TextSection widget={props.widget} />;

function Feature({ reading, ...props }) {
  const state = useEditorialContent(props, false, reading);
  const item = state.content;
  const visible = item && !isHidden(item) && contentRoute(item) && plainText(item.DisplayName);
  return <section className={`ed-section ed-feature${reading ? ' ed-reading-feature' : ''}`}>
    <SectionHeading widget={props.widget} />
    <Status state={state} empty={!visible} />
    {!state.loading && !state.error && visible && <article className="ed-feature-article">
      <Cover item={item} />
      <div className="ed-content"><ArticleText item={item} heading={plainText(props.widget?.Title) ? 'h3' : 'h2'} />
        <Actions item={item} reading={reading} /></div>
    </article>}
  </section>;
}
export const EditorialFeature = props => <Feature {...props} />;
export const EditorialReadingFeature = props => <Feature {...props} reading />;

function Collection({ variant, reading, ...props }) {
  const state = useEditorialContent(props, true, reading);
  const items = state.items.filter(item => plainText(item.DisplayName) &&
    (!reading || !/Translation$/i.test(item.Type || '')));
  const listClass = { stories: 'ed-story-grid', timeline: 'ed-timeline-list', reading: 'ed-reading-list', topics: 'ed-topic-list' }[variant];
  return <section className={`ed-section ed-${variant}`}>
    <SectionHeading widget={props.widget} />
    <Status state={state} empty={!items.length} />
    {!state.loading && !state.error && items.length > 0 && <ul className={listClass}>
      {items.map(item => <li key={item.Id || item.Path} className={variant === 'timeline' ? 'ed-timeline-item' : undefined}>
        {variant === 'topics' ? <Link className="ed-topic" to={contentRoute(item)}>
          <span className="ed-title">{plainText(item.DisplayName)}</span>
          {plainText(item.Description) && <span className="ed-excerpt">{plainText(item.Description)}</span>}
        </Link> : <article className={reading ? 'ed-work' : 'ed-card'}>
          <Cover item={item} /><div className="ed-content"><ArticleText item={item} />
            <Actions item={item} reading={reading} /></div>
        </article>}
      </li>)}
    </ul>}
  </section>;
}
export const EditorialStories = props => <Collection {...props} variant="stories" />;
export const EditorialTimeline = props => <Collection {...props} variant="timeline" />;
export const EditorialReading = props => <Collection {...props} variant="reading" reading />;
export const EditorialTopics = props => <Collection {...props} variant="topics" />;
