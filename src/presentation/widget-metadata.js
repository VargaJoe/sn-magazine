import { metadataText } from '../page-meta';

// An opt-in source Widget supplies a default title pattern. Native context and
// Layout metadata retain priority, and sites without that Widget are unchanged.
export function pageWithWidgetMetadata(context, page, widgets) {
  const source = widgets?.find(widget => widget.ClientComponent === 'magazine-source');
  if (!source || !page || metadataText(context?.MetaTitle) || metadataText(page.MetaTitle)) return page;
  const pattern = source.PageTitlePattern;
  const title = metadataText(context?.DisplayName);
  const site = metadataText(context?.Workspace?.DisplayName || context?.DisplayName);
  if (typeof pattern !== 'string' || pattern.length > 300 || !pattern.includes('{title}') || !pattern.includes('{site}') || !title || !site) return page;
  return { ...page, MetaTitle: metadataText(pattern.replaceAll('{title}', title).replaceAll('{site}', site)) };
}
