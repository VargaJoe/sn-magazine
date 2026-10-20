const PAGE_SIZE = 500;
const MAX_URLS = 50000;
// Leave room for the function response envelope within Netlify's payload limit.
const MAX_XML_BYTES = 5 * 1024 * 1024;
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, max-age=86400, must-revalidate',
};

function configuredUrl(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid site configuration');
  }
  return url;
}

export function siteOrigin(env) {
  const url = configuredUrl(env.REACT_APP_SITE_HOST);
  if (url.pathname !== '/') throw new Error('Expected a site origin');
  return url.origin;
}

function readConfiguration(env) {
  const api = configuredUrl(env.REACT_APP_API_URL);
  const root = env.REACT_APP_DATA_PATH?.trim().replace(/\/+$/, '');
  if (!root || !/^\/Root\/Content(?:\/|$)/.test(root) ||
      /[\\\x00-\x1f?#]/.test(root) || root.split('/').some(x => x === '.' || x === '..')) {
    throw new Error('Invalid content root');
  }
  const widgetType = env.REACT_APP_WIDGET_TYPE || 'Widget';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(widgetType)) throw new Error('Invalid widget type');
  return { api: api.href.replace(/\/$/, ''), root, origin: siteOrigin(env), widgetType };
}

function xmlEscape(value) {
  return value.replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[x]));
}

function contentUrl(content, { root, origin, widgetType }) {
  const path = content.Path;
  if (typeof path !== 'string' || (path !== root && !path.startsWith(`${root}/`)) ||
      content.Hidden === true || content.Hidden === 1 || content.Hidden === 'true' ||
      ['File', 'Image', 'SystemFolder', widgetType].includes(content.Type)) return null;
  const relative = path.slice(root.length);
  const segments = relative.split('/').slice(1);
  // Parenthesized folders are the engine's repository configuration/asset branches.
  if (segments.some(x => !x || x.startsWith('(') || x === '.' || x === '..' || /[\\\x00-\x1f]/.test(x))) return null;
  const encoded = segments.map(x => encodeURIComponent(x).replace(/[!'()*]/g,
    char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
  return `${origin}/${encoded}`;
}

function lastModified(content) {
  // A collection's own timestamp does not describe changes to its child listing.
  if (content.IsFolder !== false || typeof content.ModificationDate !== 'string') return '';
  const value = content.ModificationDate;
  const dotNet = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(value);
  if (!dotNet && !/^\d{4}-\d{2}-\d{2}T/.test(value)) return '';
  const date = new Date(dotNet ? Number(dotNet[1]) : value);
  return Number.isNaN(date.getTime()) ? '' : `<lastmod>${date.toISOString()}</lastmod>`;
}

async function loadContents(configuration, fetchImpl, signal) {
  const { api, root, widgetType } = configuration;
  const contents = [];
  const pages = new Set();
  while (true) {
    const url = new URL(`${api}/OData.svc/Root/Content`);
    url.searchParams.set('query', `+InTree:${JSON.stringify(root)} +Hidden:0 -TypeIs:File -TypeIs:SystemFolder -TypeIs:${widgetType} .SORT:Id .TOP:${PAGE_SIZE} .SKIP:${contents.length}`);
    url.searchParams.set('$select', 'Id,Path,Type,Hidden,IsFolder,ModificationDate');
    url.searchParams.set('$inlinecount', 'allpages');
    url.searchParams.set('metadata', 'no');
    url.searchParams.set('enableautofilters', 'true');
    url.searchParams.set('enablelifespanfilter', 'true');
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit', redirect: 'error', signal,
    });
    if (!response.ok) throw new Error(`Repository returned ${response.status}`);
    const body = await response.json();
    const results = body?.d?.results;
    if (!Array.isArray(results)) throw new Error('Invalid repository response');
    if (results.length === 0) {
      const count = Number(body.d.__count);
      if (Number.isFinite(count) && count > contents.length) throw new Error('Incomplete repository response');
      return contents;
    }
    const page = JSON.stringify(results.map(x => [x.Id, x.Path]));
    if (pages.has(page)) throw new Error('Repository pagination did not advance');
    pages.add(page);
    contents.push(...results);
    if (contents.length > MAX_URLS) throw new Error('Sitemap needs partitioning');
    // Do not stop on a short page: repositories may cap the requested page size.
    // Read to an empty page even when __count is missing or changes during paging.
  }
}

export async function generateSitemap(env, fetchImpl = fetch) {
  const configuration = readConfiguration(env);
  const contents = await loadContents(configuration, fetchImpl, AbortSignal.timeout(25000));
  const entries = new Map();
  for (const content of contents) {
    const url = contentUrl(content, configuration);
    if (url && !entries.has(url)) entries.set(url, lastModified(content));
  }
  if (entries.size === 0) throw new Error('No public pages found');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([url, modified]) => `  <url><loc>${xmlEscape(url)}</loc>${modified}</url>`).join('\n') +
    '\n</urlset>\n';
  if (Buffer.byteLength(xml) > MAX_XML_BYTES) throw new Error('Sitemap needs partitioning');
  return xml;
}

export async function handleSitemap(request, env = process.env, fetchImpl = fetch) {
  if (!['GET', 'HEAD'].includes(request.method)) return unavailable(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  try {
    const xml = await generateSitemap(env, fetchImpl);
    return new Response(request.method === 'HEAD' ? null : xml, {
      headers: { ...CACHE_HEADERS, 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error.message);
    return unavailable(503, 'Sitemap temporarily unavailable', { 'Retry-After': '300' }, request.method === 'HEAD');
  }
}

function unavailable(status, message, headers = {}, head = false) {
  return new Response(head ? null : `${message}\n`, {
    status, headers: { 'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store', ...headers },
  });
}

export function handleRobots(request, env = process.env) {
  if (!['GET', 'HEAD'].includes(request.method)) return unavailable(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  try {
    const text = `User-agent: *\nDisallow:\n\nSitemap: ${siteOrigin(env)}/sitemap.xml\n`;
    return new Response(request.method === 'HEAD' ? null : text, {
      headers: { ...CACHE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return unavailable(503, 'Robots configuration temporarily unavailable', {}, request.method === 'HEAD');
  }
}
