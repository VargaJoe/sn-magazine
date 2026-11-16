import { pageWithWidgetMetadata } from './widget-metadata';

const context = { DisplayName: 'Story &amp; memory', Workspace: { DisplayName: 'Review journal' } };
const page = { PageTemplate: 'reader-magazine' };
const widgets = [{ ClientComponent: 'magazine-source', PageTitlePattern: '{title} | {site}' }];

it('resolves the opt-in native source pattern before the common metadata pipeline', () => {
  expect(pageWithWidgetMetadata(context, page, widgets)).toEqual({ ...page, MetaTitle: 'Story & memory | Review journal' });
  expect(page.MetaTitle).toBeUndefined();
});
it('leaves existing sites and explicit context/Layout titles in control', () => {
  expect(pageWithWidgetMetadata(context, page, [])).toBe(page);
  const explicit = { ...page, MetaTitle: 'Editor title' };
  expect(pageWithWidgetMetadata(context, explicit, widgets)).toBe(explicit);
  expect(pageWithWidgetMetadata({ ...context, MetaTitle: 'Context title' }, page, widgets)).toBe(page);
});
it.each(['only a title', '{title}', '{site}', null, 'x'.repeat(301)])('ignores incomplete patterns: %j', pattern => {
  expect(pageWithWidgetMetadata(context, page, [{ ...widgets[0], PageTitlePattern: pattern }])).toBe(page);
});
