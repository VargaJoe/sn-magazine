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

export function buildPageMetadata(context, page, dataPath) {
  if (!context) return { title: '', description: '', robots: '' };
  const first = (...values) => {
    for (const value of values) {
      const normalized = metadataText(value);
      if (normalized) return normalized;
    }
    return '';
  };
  return {
    title: first(context.MetaTitle, page?.MetaTitle) || buildPageTitle(context, dataPath),
    description: first(context.MetaDescription, page?.MetaDescription,
      context.Description, context.Workspace?.Description),
    robots: first(context.MetaRobots, page?.MetaRobots),
  };
}
