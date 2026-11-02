export function encodeSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g,
    char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function encodePath(path) {
  return path.split('/').map(encodeSegment).join('/');
}

function configuredUrl(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid site URL configuration');
  }
  return url;
}

function validPath(path) {
  return typeof path === 'string' && path.startsWith('/') &&
    !/[\\\x00-\x1f?#%]/.test(path) &&
    path.slice(1).split('/').every(x => x && x !== '.' && x !== '..');
}

export function readSiteSettings(env, { requireSitemap = false } = {}) {
  const api = configuredUrl(env.REACT_APP_API_URL).href.replace(/\/$/, '');
  const site = configuredUrl(env.REACT_APP_SITE_HOST);
  if (site.pathname !== '/') throw new Error('Expected a canonical site origin');
  const root = env.REACT_APP_DATA_PATH?.trim().replace(/\/+$/, '');
  if (!validPath(root) || !/^\/Root\/Content(?:\/|$)/.test(root)) {
    throw new Error('Invalid content root');
  }
  const widgetType = env.REACT_APP_WIDGET_TYPE || 'Widget';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(widgetType)) throw new Error('Invalid widget type');
  const sitemapPath = env.REACT_APP_SITEMAP_PATH?.trim() || '';
  if (sitemapPath && (!validPath(sitemapPath) || !/\.xml$/i.test(sitemapPath))) {
    throw new Error('REACT_APP_SITEMAP_PATH must be a site-relative XML file path');
  }
  if (requireSitemap && !sitemapPath) throw new Error('REACT_APP_SITEMAP_PATH is required');
  const repositoryPath = sitemapPath ? `${root}${sitemapPath}` : null;
  return { api, root, origin: site.origin, widgetType, sitemapPath, repositoryPath,
    sitemapUrl: repositoryPath ? `${api}${encodePath(repositoryPath)}` : null };
}

export function itemUrl(api, path, action = '') {
  const split = path.lastIndexOf('/');
  const parent = path.slice(0, split);
  const name = path.slice(split + 1).replace(/'/g, "''");
  return new URL(`${api}/OData.svc${encodePath(parent)}('${encodeSegment(name)}')${action ? `/${action}` : ''}`);
}
