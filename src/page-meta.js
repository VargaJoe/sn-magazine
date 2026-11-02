const text = value => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^(undefined|null|W3\.CSS Template)$/i.test(trimmed) ? '' : trimmed;
};

// The existing site configuration is the SenseNet Workspace, expanded with
// the route content. No second site-name registry or hostname mapping.
export function buildPageTitle(context, dataPath) {
  if (!context) return '';
  const isHome = (context.Id != null && context.Workspace?.Id != null && context.Id === context.Workspace.Id) ||
    (typeof context.Path === 'string' && typeof dataPath === 'string' &&
      context.Path.replace(/\/+$/, '') === dataPath.replace(/\/+$/, ''));
  const contentTitle = text(context.DisplayName);
  const siteName = text(isHome ? context.DisplayName : context.Workspace?.DisplayName);
  if (!siteName || (!isHome && !contentTitle)) return '';
  return isHome ? siteName : `${siteName} - ${contentTitle}`;
}

// Repository descriptions can contain HTML. Parse in an inert template so tags,
// entities and visually empty editor markup do not leak into SEO metadata.
export function metadataText(value) {
  const source = text(value);
  if (!source) return '';
  const template = document.createElement('template');
  template.innerHTML = source;
  template.content.querySelectorAll('script, style, template').forEach(node => node.remove());
  template.content.querySelectorAll('br,hr,p,div,li,h1,h2,h3,h4,h5,h6,blockquote,tr,td,th,section,article,ul,ol,table')
    .forEach(node => { node.before(' '); node.after(' '); });
  return text(template.content.textContent.replace(/[\s\u200b\ufeff]+/g, ' '));
}

// SenseNet dates use an ISO timestamp with a timezone, or legacy /Date(ms)/.
// Match the sitemap's timestamp semantics, including legacy offset suffixes.
export function publicationTime(value) {
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

export function buildPageMetadata(context, page, dataPath, now = Date.now()) {
  if (!context) return { title: '', description: '', robots: '' };
  const first = (...values) => {
    for (const value of values) {
      const normalized = metadataText(value);
      if (normalized) return normalized;
    }
    return '';
  };
  const publishTime = publicationTime(context.PublishDate);
  return {
    title: first(context.MetaTitle, page?.MetaTitle) || buildPageTitle(context, dataPath),
    description: first(context.MetaDescription, page?.MetaDescription,
      context.Description, context.Workspace?.Description),
    robots: publishTime !== null && publishTime > now ? 'noindex, follow' : first(context.MetaRobots, page?.MetaRobots),
  };
}
