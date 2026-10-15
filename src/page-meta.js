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
