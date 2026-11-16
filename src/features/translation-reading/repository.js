import { references, isHidden, contentRoute } from '../../components/editorial/repository';

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
