import React from 'react';
import { Link } from 'react-router-dom';
import { contentRoute, coverUrl, plainText, publishedDate } from '../editorial/repository';
import { categoryFor, annotationFor } from './model';
import { useMagazine } from './provider';
import { safeLink, articleTeaser } from './body';

export function categoryColour(item, annotations) {
  const value = annotationFor(item, annotations)?.AccentColor;
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

export function Status({ loading, error, empty = false }) {
  if (loading) return <p className="rm-status" role="status">Betöltés…</p>;
  if (error) return <p className="rm-status" role="status">A tartalom most nem tölthető be. Próbáld újra az oldal frissítésével.</p>;
  return empty ? <p className="rm-status">Még nincs megjeleníthető írás.</p> : null;
}
export function Heading({ widget }) {
  return <>{plainText(widget.Title) && <h2 className="rm-section-heading">{plainText(widget.Title)}</h2>}
    {plainText(widget.ComponentDescription) && <p className="rm-description">{plainText(widget.ComponentDescription)}</p>}</>;
}
export function SmartLink({ href, children, ...props }) {
  const safe = safeLink(href);
  if (!safe) return <span {...props}>{children}</span>;
  return safe.startsWith('/') ? <Link {...props} to={safe}>{children}</Link> : <a {...props} href={safe} rel="noopener noreferrer">{children}</a>;
}
export function Cover({ item, className = 'rm-cover' }) {
  const src = coverUrl(item);
  return src ? <img className={className} src={src} alt="" loading="lazy" /> : <div className={className + ' rm-cover-placeholder'} aria-hidden="true" />;
}
export function Metadata({ item }) {
  const { categories, annotations } = useMagazine();
  const category = categoryFor(item, categories);
  const date = publishedDate(item.PublishDate);
  return <div className="rm-meta">{category && <Link style={{ color: categoryColour(category, annotations) }} to={contentRoute(category)}>{plainText(category.DisplayName)}</Link>}
    {date && <time dateTime={date.value}>{date.label}</time>}</div>;
}
export function Card({ item, featured = false, book = false, compact = false }) {
  const href = contentRoute(item);
  const excerpt = plainText(item.Lead) || plainText(item.Description) || articleTeaser(item.Body);
  return <article className={featured ? 'rm-feature' : book ? 'rm-book' : compact ? 'rm-card rm-card-compact' : 'rm-card'}>
    <Link className={featured ? 'rm-feature-media' : 'rm-card-media'} to={href} tabIndex="-1" aria-hidden="true"><Cover item={item} /></Link>
    <div className={featured ? 'rm-feature-body' : 'rm-card-body'}><Metadata item={item} />
      <h3 className="rm-title"><Link to={href}>{plainText(item.DisplayName)}</Link></h3>
      {featured && plainText(item.Subtitle) && <p className="rm-subtitle">{plainText(item.Subtitle)}</p>}
      {!book && excerpt && <p className="rm-excerpt">{excerpt}</p>}
      {featured && <Link className="rm-action" to={href}>Elolvasom →</Link>}
    </div>
  </article>;
}
export function Breadcrumb({ current, category }) {
  return <nav className="rm-breadcrumb" aria-label="Morzsamenü"><Link to="/">Főoldal</Link>
    {category && <><span aria-hidden="true"> › </span><Link to={contentRoute(category)}>{plainText(category.DisplayName)}</Link></>}
    <span aria-hidden="true"> › </span><span aria-current="page">{plainText(current?.DisplayName)}</span></nav>;
}
export function PageHeading({ context }) {
  return <><Breadcrumb current={context} /><div className="rm-page-heading"><h1>{plainText(context.DisplayName)}</h1>
    {plainText(context.Description) && <p className="rm-description">{plainText(context.Description)}</p>}</div></>;
}
