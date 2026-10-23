import { encodeSegment, readSiteSettings } from './site-settings.mjs';

const PAGE_SIZE = 500;
const MAX_URLS = 50000;
const MAX_XML_BYTES = 50 * 1024 * 1024;
const UNSET_DATE = Date.parse('0001-01-01T00:00:00Z');

function xmlEscape(value) {
  return value.replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[x]));
}

function contentCandidate(content, { root, origin, widgetType, repositoryPath }) {
  const path = content.Path;
  if (typeof path !== 'string' || (path !== root && !path.startsWith(`${root}/`))) {
    return { reason: 'outside-content-root' };
  }
  if (path === repositoryPath) return { reason: 'sitemap-file' };
  if (['File', 'Image', 'SystemFolder', widgetType].includes(content.Type)) return { reason: 'technical-type' };
  const relative = path.slice(root.length);
  const segments = relative.split('/').slice(1);
  // Parenthesized folders are the engine's repository configuration/asset branches.
  if (segments.some(x => !x || x.startsWith('(') || x === '.' || x === '..' || /[\\\x00-\x1f]/.test(x))) {
    return { reason: 'technical-or-unsafe-path' };
  }
  const encoded = segments.map(encodeSegment).join('/');
  return { url: `${origin}/${encoded}` };
}

function repositoryDate(value) {
  if (typeof value !== 'string') return null;
  value = value.trim();
  const dotNet = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(value);
  if (!dotNet) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!iso) return null;
    const [year, month, day, hour, minute, second] = iso.slice(1).map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  }
  const time = dotNet ? Number(dotNet[1]) : Date.parse(value);
  const date = new Date(time);
  return !Number.isFinite(time) || Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ? null : time;
}

function isHidden(value) {
  return value === true || value === 1 ||
    (typeof value === 'string' && ['true', '1'].includes(value.trim().toLowerCase()));
}

function isNavigation(content) {
  // Choice fields are arrays; accept a scalar stored choice too, never substrings.
  const zones = Array.isArray(content.DisplayZone) ? content.DisplayZone : [content.DisplayZone];
  return zones.some(zone => zone === 'menuitem' || zone === 'menuicon');
}

function visibility(content, root, now, hiddenPaths) {
  if (isHidden(content.Hidden) || hiddenPaths.has(content.Path)) return { reason: 'hidden' };
  for (let path = content.Path.slice(0, content.Path.lastIndexOf('/')); path; path = path.slice(0, path.lastIndexOf('/'))) {
    if (hiddenPaths.has(path)) return { reason: 'hidden-ancestor' };
    if (path === root) break;
  }
  if (['SoftLink', 'Banner'].includes(content.Type) ||
      (typeof content.Url === 'string' && content.Url.trim())) return { reason: 'external-link' };
  const hasPublishDate = content.PublishDate !== undefined && content.PublishDate !== null && content.PublishDate !== '' &&
    !(typeof content.PublishDate === 'string' && content.PublishDate.trim() === '');
  const parsed = hasPublishDate ? repositoryDate(content.PublishDate) : null;
  if (hasPublishDate && parsed === null) return { reason: 'invalid-publish-date' };
  // DateTime.MinValue is the repository's unset-date representation, not a release.
  const published = parsed === UNSET_DATE ? null : parsed;
  if (published !== null && published > now) return { reason: 'future-publish-date' };
  if (content.Path === root) return { included: true, reason: 'home', published: false };
  if (published !== null) return { included: true, reason: 'published-content', published: true };
  if (isNavigation(content)) return { included: true, reason: 'navigation', published: false };
  return { reason: 'not-navigation-or-published-content' };
}

function lastModified(content, published) {
  // Editorial content can be a SenseNet folder; navigation collections still lack
  // a reliable timestamp for their changing child listings.
  if (!published && content.IsFolder !== false) return '';
  const time = repositoryDate(content.ModificationDate);
  return time === null || time === UNSET_DATE ? '' : new Date(time).toISOString();
}

async function loadContents(configuration, fetchImpl, signal, hiddenOnly = false) {
  const { api, root, widgetType } = configuration;
  const contents = [];
  const pages = new Set();
  while (true) {
    const url = new URL(`${api}/OData.svc/Root/Content`);
    const selection = hiddenOnly ? '+Hidden:1' : `+Hidden:0 -TypeIs:File -TypeIs:SystemFolder -TypeIs:${widgetType}`;
    url.searchParams.set('query', `+InTree:${JSON.stringify(root)} ${selection} .SORT:Id .TOP:${PAGE_SIZE} .SKIP:${contents.length}`);
    url.searchParams.set('$select', hiddenOnly ? 'Id,Path,Type,Hidden,IsFolder' : 'Id,Path,Type,Hidden,IsFolder,ModificationDate,PublishDate,DisplayZone,Url');
    url.searchParams.set('$inlinecount', 'allpages');
    url.searchParams.set('metadata', 'no');
    url.searchParams.set('enableautofilters', hiddenOnly ? 'false' : 'true');
    url.searchParams.set('enablelifespanfilter', hiddenOnly ? 'false' : 'true');
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit', redirect: 'error', signal,
    });
    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      throw new Error(`Repository returned ${response.status}`);
    }
    let body;
    try { body = await response.json(); } catch { throw new Error('Invalid repository response'); }
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

export async function generateSitemapReport(env, fetchImpl = fetch, { now } = {}) {
  const configuration = readSiteSettings(env);
  // Freeze one publication cutoff before paging so a single run is deterministic.
  const instant = now === undefined ? Date.now() : now instanceof Date ? now.getTime() :
    typeof now === 'number' ? now : repositoryDate(now);
  if (instant === null || !Number.isFinite(instant) || Number.isNaN(new Date(instant).getTime())) {
    throw new Error('Invalid sitemap generation time');
  }
  const asOf = new Date(instant).toISOString();
  const signal = AbortSignal.timeout(120000);
  const visible = await loadContents(configuration, fetchImpl, signal);
  // Hidden containers can be SystemFolder/Widget types omitted by the page query.
  // Read only their public metadata, including inactive ancestors, with no writer.
  const hidden = await loadContents(configuration, fetchImpl, signal, true);
  const visiblePaths = new Set(visible.map(content => content.Path));
  const contents = [...visible, ...hidden.filter(content => !visiblePaths.has(content.Path))];
  if (contents.length > MAX_URLS) throw new Error('Sitemap needs partitioning');
  const hiddenPaths = new Set([...visible, ...hidden].filter(content => isHidden(content.Hidden) && typeof content.Path === 'string' &&
    (content.Path === configuration.root || content.Path.startsWith(`${configuration.root}/`))).map(content => content.Path));
  const entries = new Map();
  const excluded = [];
  for (const content of contents) {
    const candidate = contentCandidate(content, configuration);
    const record = { path: content.Path, type: content.Type, ...candidate };
    if (!candidate.url) {
      if (candidate.reason === 'technical-type' && hiddenPaths.has(content.Path)) record.reason = 'hidden';
      excluded.push(record);
      continue;
    }
    const selected = visibility(content, configuration.root, instant, hiddenPaths);
    if (!selected.included) { excluded.push({ ...record, reason: selected.reason }); continue; }
    if (entries.has(candidate.url)) { excluded.push({ ...record, reason: 'duplicate-url' }); continue; }
    entries.set(candidate.url, { ...record, reason: selected.reason, lastmod: lastModified(content, selected.published) });
  }
  if (entries.size === 0) throw new Error('No public pages found');
  const sorted = [...entries.values()].sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sorted.map(({ url, lastmod }) => `  <url><loc>${xmlEscape(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
  if (Buffer.byteLength(xml) > MAX_XML_BYTES) throw new Error('Sitemap needs partitioning');
  const eligiblePaths = new Set(sorted.map(entry => entry.path));
  const navigationPaths = new Set(contents.filter(content => isNavigation(content) && eligiblePaths.has(content.Path))
    .map(content => content.Path));
  const hasNavigationAncestor = candidate => {
    for (let path = candidate; path; path = path.slice(0, path.lastIndexOf('/'))) {
      if (navigationPaths.has(path)) return true;
    }
    return false;
  };
  const warnings = sorted.filter(entry => entry.reason === 'published-content' &&
    !hasNavigationAncestor(entry.path))
    .map(entry => ({ code: 'published-content-without-navigation-ancestor', path: entry.path, url: entry.url }));
  return { xml, asOf, entries: sorted, excluded, warnings };
}

export async function generateSitemap(env, fetchImpl = fetch, options = {}) {
  return (await generateSitemapReport(env, fetchImpl, options)).xml;
}
