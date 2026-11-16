import React from 'react';
import { Link } from 'react-router-dom';
import { plainText, contentRoute, useEditorialContent, isHidden } from '../../components/editorial/repository';
import { SectionHeading, Status, Cover, ArticleText } from '../../components/editorial/sections';
import { firstTranslation, translationTarget } from './repository';

function ReadingActions({ item }) {
  const route = contentRoute(item);
  const first = firstTranslation(item);
  const target = first ? translationTarget(first) : null;
  return <div className="ed-actions">
    {route && <Link className="ed-action" to={route}>Ismertető</Link>}
    {target && (target.external ?
      <a className="ed-action ed-action-reading" href={target.href} target="_blank" rel="noopener noreferrer">{target.label}</a> :
      <Link className="ed-action ed-action-reading" to={target.href}>{target.label}</Link>)}
  </div>;
}

export function EditorialReadingFeature(props) {
  const state = useEditorialContent(props, false, ['Translation']);
  const item = state.content;
  const visible = item && !isHidden(item) && contentRoute(item) && plainText(item.DisplayName);
  return <section className="ed-section ed-feature ed-reading-feature">
    <SectionHeading widget={props.widget} /><Status state={state} empty={!visible} />
    {!state.loading && !state.error && visible && <article className="ed-feature-article">
      <Cover item={item} /><div className="ed-content"><ArticleText item={item} heading={plainText(props.widget?.Title) ? 'h3' : 'h2'} />
        <ReadingActions item={item} /></div></article>}
  </section>;
}

export function EditorialReading(props) {
  const state = useEditorialContent(props, true, ['Translation']);
  const items = state.items.filter(item => plainText(item.DisplayName) && !/Translation$/i.test(item.Type || ''));
  return <section className="ed-section ed-reading"><SectionHeading widget={props.widget} /><Status state={state} empty={!items.length} />
    {!state.loading && !state.error && items.length > 0 && <ul className="ed-reading-list">{items.map(item =>
      <li key={item.Id || item.Path}><article className="ed-work"><Cover item={item} />
        <div className="ed-content"><ArticleText item={item} /><ReadingActions item={item} /></div></article></li>)}</ul>}
  </section>;
}
