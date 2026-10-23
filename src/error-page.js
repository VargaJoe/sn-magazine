import { maintenanceSiteName, maintenanceTitle, notFoundTitle,
  notFoundText, homeLabel, sectionsLabel, retryLabel } from './configuration';

const name = value => typeof value === 'string' && value.trim() &&
  !/^(undefined|null|W3\.CSS Template)$/i.test(value.trim()) ? value.trim() : '';

export function siteForContext(context, root) {
  return context?.Path?.replace(/\/+$/, '') === root?.replace(/\/+$/, '') ? context : context?.Workspace;
}

export function errorPageData(pageType, site, root, onRetry) {
  const expanded = site?.Children?.results || site?.Children;
  const children = Array.isArray(expanded) ? expanded : [];
  const sections = children.filter(child => {
    if (!child || typeof child !== 'object') return false;
    const zones = Array.isArray(child.DisplayZone) ? child.DisplayZone : [child.DisplayZone];
    const hasUrl = child.Url != null && (typeof child.Url !== 'string' || child.Url.trim());
    return zones.includes('menuitem') && ![true, 1, 'true', '1'].includes(child.Hidden) &&
      !hasUrl && name(child.DisplayName) && typeof child.Path === 'string' &&
      child.Path.startsWith(`${root}/`);
  }).flatMap(child => {
    const segments = child.Path.slice(root.length + 1).split('/');
    if (segments.some(part => !part || part.startsWith('(') || part === '.' || part === '..' ||
        part.includes('\\') || [...part].some(character => character.charCodeAt(0) < 32))) return [];
    return [{ title: child.DisplayName, path: '/' + segments.map(encodeURIComponent).join('/') }];
  });
  const siteName = name(site?.DisplayName) || name(maintenanceSiteName);
  const title = pageType === 'not_found' ? notFoundTitle : maintenanceTitle;
  return { siteName, title, pageTitle: `${siteName} - ${title}`, text: notFoundText,
    homeLabel, sectionsLabel, retryLabel, sections, onRetry };
}
