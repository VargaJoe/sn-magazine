import { useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useSnStore } from '../store/sn-store';
import { loadWithTimeout } from '../../page-load';
import { metadataText } from '../../page-meta';

export const plainText = metadataText;
export function plainParagraphs(value) {
  if (typeof value !== 'string') return [];
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('script,style,template').forEach(node => node.remove());
  template.content.querySelectorAll('p,div,br,hr,li,blockquote,h1,h2,h3,h4,h5,h6')
    .forEach(node => { node.before('\n'); node.after('\n'); });
  return template.content.textContent.split(/\n+/).map(line => line.replace(/[\s\u200b\ufeff]+/g, ' ').trim()).filter(Boolean);
}
const choice = value => Array.isArray(value) ? value[0] : value;
export const references = value => Array.isArray(value) ? value :
  (Array.isArray(value?.results) ? value.results : []);
export const isHidden = item => [true, 1, '1', 'true'].includes(item?.Hidden);
const hasControlCharacters = value => [...value].some(character => character.charCodeAt(0) < 32);

// Paths are repository data, never URLs supplied directly to the router.
export function repositoryPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\?#]/.test(value) || hasControlCharacters(value)) return '';
  const path = value.replace(/\/+$/, '');
  if (!path || path.includes('//')) return '';
  try {
    if (path.slice(1).split('/').some(part => {
      const decoded = decodeURIComponent(part);
      return !decoded || decoded === '.' || decoded === '..' || /[\\/]/.test(decoded) || hasControlCharacters(decoded);
    })) return '';
  } catch (_) { return ''; }
  return path;
}

export function contentRoute(item, root = process.env.REACT_APP_DATA_PATH) {
  const path = repositoryPath(item?.Path);
  const base = repositoryPath(root);
  if (!base || !path || (path !== base && !path.startsWith(`${base}/`))) return '';
  return path === base ? '/' : `/${path.slice(base.length + 1).split('/').map(encodeURIComponent).join('/')}`;
}

export function repositoryImage(value, origin = process.env.REACT_APP_API_URL) {
  if (typeof value !== 'string' || !value.trim() || !origin) return '';
  try {
    const base = new URL(origin);
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(base.protocol) || url.origin !== base.origin ||
        !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch (_) { return ''; }
}

export function coverUrl(item) {
  return repositoryImage(item?.Image?.Url) || repositoryImage(item?.ImageData?.Url) ||
    repositoryImage(item?.ImageData) || repositoryImage(item?.Image?.Binary?.__mediaresource?.media_src);
}

export function publishedDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Reject normalized dates such as February 31, and repository sentinel years.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) return null;
  return { value, label: new Intl.DateTimeFormat('hu-HU', { timeZone: 'UTC', year: 'numeric',
    month: 'long', day: 'numeric' }).format(date) };
}

export function firstTranslation(item) {
  const index = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : Infinity;
  return references(item?.Translation).filter(ref => !isHidden(ref) && contentRoute(ref))
    .slice().sort((a, b) => index(a.Index) - index(b.Index))[0];
}

export function translationTarget(item) {
  const external = value => {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return '';
    try {
      const url = new URL(value);
      return url.username || url.password ? '' : url.href;
    } catch (_) { return ''; }
  };
  const reader = external(item?.ReaderUrl);
  if (reader) return { href: reader, label: 'Olvasás az elejétől', external: true };
  const download = external(item?.Url);
  if (download) return { href: download, label: 'Első fejezet letöltése', external: true };
  const route = contentRoute(item);
  return route ? { href: route, label: 'Első fejezet', external: false } : null;
}

export function useEditorialContent(props, collection = false, reading = false) {
  const repo = useRepository();
  const context = useSnStore(state => state.context);
  const widget = props.widget || {};
  const source = props.data?.context || props.data || context;
  const binding = choice(widget.ContextBinding) || 'currentcontext';
  const bound = binding === 'customroot' ? references(widget.CustomRoot)[0] || widget.CustomRoot :
    binding === 'currentsite' ? context?.Workspace ||
      { Path: process.env.REACT_APP_DATA_PATH } : context || source;
  const basePath = repositoryPath(bound?.Path);
  const relative = typeof widget.RelativePath === 'string' ? widget.RelativePath : '';
  const path = relative ? repositoryPath(`${basePath}/${relative.replace(/^\/+/, '')}`) : basePath;
  const expands = ['Workspace', ...(typeof widget.Expand === 'string' ? widget.Expand.split(',') : []),
    ...(reading ? ['Translation'] : [])].map(value => value.trim()).filter(Boolean);
  const key = JSON.stringify({ path, root: process.env.REACT_APP_DATA_PATH,
    navigation: context?.Path, id: widget.Id, level: choice(widget.ChildrenLevel) || 'child',
    query: typeof widget.ContentQuery === 'string' ? widget.ContentQuery : '',
    expand: [...new Set(expands)].join(','), type: relative ? null : bound?.Type, relative: !!relative,
    collection });
  const [state, setState] = useState(null);

  useEffect(() => {
    const spec = JSON.parse(key);
    const controller = new AbortController();
    let cancelled = false;
    const finish = value => { if (!cancelled) setState({ key, repo, ...value }); };
    const load = (method, options) => loadWithTimeout({ load: request => repo[method](request) }, options, controller.signal);
    const options = { select: 'all', expand: spec.expand, metadata: 'no',
      enableautofilters: 'on', enablelifespanfilter: 'on' };
    const run = async () => {
      if (!spec.root || !contentRoute({ Path: spec.path }, spec.root) ||
          (spec.collection && spec.level === 'none')) {
        finish({ items: [], content: null });
        return;
      }
      try {
        if (!spec.collection) {
          const result = await load('load', { idOrPath: spec.path, oDataOptions: options });
          finish({ content: result?.d || null, items: [] });
          return;
        }
        let type = spec.type;
        if (spec.relative) {
          const result = await load('load', { idOrPath: spec.path, oDataOptions: options });
          if (cancelled) return;
          type = result?.d?.Type;
        }
        const query = spec.level === 'deep' ? spec.query :
          `${spec.query ? `(${spec.query}) AND ` : ''}InFolder:'${spec.path.replace(/'/g, "\\'")}'`;
        const result = await load('loadCollection', { path: spec.path, oDataOptions: {
          ...options, top: 40, ...(type === 'SmartFolder' ? {} : { query }),
        } });
        finish({ content: null, items: references(result?.d).filter(item =>
          item.Path !== spec.path && !isHidden(item) && contentRoute(item, spec.root)).slice(0, 40) });
      } catch (_) { finish({ error: true, content: null, items: [] }); }
    };
    run();
    return () => { cancelled = true; controller.abort(); };
  }, [key, repo]);

  // Hide old results during the render that precedes a navigation/configuration effect.
  return state?.key === key && state?.repo === repo ? { ...state, loading: false } :
    { loading: true, items: [], content: null };
}
