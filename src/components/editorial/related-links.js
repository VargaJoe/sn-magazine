import React from 'react';
import { Link } from 'react-router-dom';
import { articleBody, safeLink } from './body';
import { contentRoute, isHidden, plainText, references, repositoryImage } from './repository';
import { publicationTime } from '../../page-meta';

function mediaUrl(value) {
  if (typeof value !== 'string' || value.includes('\\')) return '';
  const href = safeLink(value);
  if (!href) return '';
  if (href.startsWith('/')) return repositoryImage(href);
  try {
    const url = new URL(href);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}

// Only known player paths are executable frames. Editor-supplied attributes and
// query parameters never cross this boundary (including autoplay and srcdoc).
function playerUrl(value) {
  const href = mediaUrl(value);
  if (!href) return '';
  const url = new URL(href);
  if (url.port || url.hash) return '';
  if (['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    const match = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  if (url.hostname === 'player.vimeo.com' && /^\/video\/[1-9]\d{0,11}$/.test(url.pathname)) {
    return `https://player.vimeo.com${url.pathname}`;
  }
  return '';
}

function embeddedMedia(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('script,style,template,svg,math,object,embed').forEach(node => node.remove());
  template.content.querySelectorAll('[hidden],[style]').forEach(node => {
    if (node.hasAttribute('hidden') || node.style.display.toLowerCase() === 'none' ||
        node.style.visibility.toLowerCase() === 'hidden') node.remove();
  });
  return [...template.content.querySelectorAll('iframe,video,audio')].flatMap(node => {
    if (node.parentElement?.closest('iframe,video,audio')) return [];
    if (node.tagName === 'IFRAME') {
      const src = playerUrl(node.getAttribute('src'));
      return src ? [{ kind: 'iframe', src, title: plainText(node.getAttribute('title')) }] : [];
    }
    const kind = node.tagName.toLowerCase();
    const candidates = [node, ...node.querySelectorAll('source')];
    const seen = new Set();
    const sources = candidates.flatMap(source => {
      const src = mediaUrl(source.getAttribute('src'));
      if (!src || seen.has(src)) return [];
      seen.add(src);
      const type = source.getAttribute('type') || '';
      return [{ src, type: new RegExp(`^${kind}/[a-z0-9.+-]+$`, 'i').test(type) ? type : undefined }];
    });
    return sources.length ? [{ kind, sources }] : [];
  });
}

function RelatedMedia({ embed, title }) {
  const media = embeddedMedia(embed);
  if (!media.length) return null;
  return <div className="ed-related-media">{media.map((item, index) => {
    if (item.kind === 'iframe') return <iframe key={index} className="ed-related-player"
      src={item.src} title={item.title || `${title} – videó`} loading="lazy"
      width="560" height="315" style={{ width: '100%', maxWidth: '100%', aspectRatio: '16 / 9', height: 'auto', border: 0 }}
      sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
    const Media = item.kind;
    return <Media key={index} className="ed-related-player" controls preload="none" aria-label={title}
      style={{ maxWidth: '100%' }} {...(item.kind === 'video' ? { playsInline: true } : {})}>
      {item.sources.map(source => <source key={source.src} src={source.src} type={source.type} />)}
    </Media>;
  })}</div>;
}

function isPublished(item, now) {
  if (!Object.prototype.hasOwnProperty.call(item, 'PublishDate')) return true;
  const time = publicationTime(item.PublishDate);
  // DateTime.MinValue is a repository sentinel, never a publication date.
  return time !== null && new Date(time).getUTCFullYear() > 1 && time <= now;
}

// Expanded references can carry their own publication state. Check it here
// without a repository lookup or site-specific route/embed knowledge.
export function RelatedLinks({ items, root }) {
  const now = Date.now();
  const visible = references(items).filter(item => item && !isHidden(item) && isPublished(item, now)).map(item => {
    const noUrl = item.Url == null || item.Url === '';
    const href = safeLink(item.Url);
    const route = href.startsWith('/') ? href : (noUrl ? contentRoute(item, root) : '');
    return { item, href, route, title: plainText(item.DisplayName) };
  }).filter(item => item.title && (item.href || item.route));
  if (!visible.length) return null;
  return <ul className="ed-related-links">{visible.map(({ item, href, route, title }, index) => {
    const description = articleBody(item.Description);
    return <li key={item.Id || item.Path || `${href}-${index}`} className="ed-related-item">
      <article><h3 className="ed-related-title">{route ? <Link to={route}>{title}</Link> :
        <a href={href} rel="noopener noreferrer">{title}</a>}</h3>
      {description && <div className="ed-related-description" dangerouslySetInnerHTML={{ __html: description }} />}
      <RelatedMedia embed={item.Embed} title={title} /></article>
    </li>;
  })}</ul>;
}
