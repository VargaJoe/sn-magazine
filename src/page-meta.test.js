import { buildPageMetadata, metadataText } from './page-meta';

const dataPath = '/Root/Content/Magazine';
const context = {
  Id: 2, Path: `${dataPath}/review`, DisplayName: 'Review',
  Description: '<p>Existing article introduction</p>',
  Lead: '<p>Visible lead stays unchanged</p>',
  Workspace: { Id: 1, DisplayName: 'Magazine', Description: 'Site description' },
};
const page = {
  MetaTitle: 'Layout title', MetaDescription: 'Layout description', MetaRobots: 'nofollow',
};

it('resolves each SEO field independently, without changing article or Layout data', () => {
  const article = Object.freeze({ ...context, MetaTitle: '  Article title  ', MetaRobots: 'index, follow' });
  const layout = Object.freeze({ ...page });
  expect(buildPageMetadata(article, layout, dataPath)).toEqual({
    title: 'Article title', description: 'Layout description', robots: 'index, follow',
  });
  expect(article.Description).toBe(context.Description);
  expect(article.Lead).toBe(context.Lead);
  expect(layout).toEqual(page);
});

it('prefers explicit context descriptions to Layout descriptions', () => {
  expect(buildPageMetadata({ ...context, MetaDescription: 'Article SEO' }, page, dataPath).description)
    .toBe('Article SEO');
});

it.each([undefined, null, 42, '', ' \n\t ', '<p></p>', '<p>&nbsp;<br></p>', '\u200b\ufeff'])
  ('treats an empty or invalid context meta field as absent: %j', value => {
    expect(buildPageMetadata({ ...context, MetaTitle: value, MetaDescription: value, MetaRobots: value }, page, dataPath))
      .toEqual({ title: 'Layout title', description: 'Layout description', robots: 'nofollow' });
  });

it('retains the automatic title and existing Description fallback on older schemas', () => {
  expect(buildPageMetadata(context, null, dataPath)).toEqual({
    title: 'Magazine - Review', description: 'Existing article introduction', robots: '',
  });
});

it('falls back through empty editor markup to the Workspace description', () => {
  expect(buildPageMetadata({ ...context, MetaDescription: '<p>&nbsp;</p>', Description: '<p><br></p>' },
    { MetaDescription: '   ' }, dataPath).description).toBe('Site description');
  expect(buildPageMetadata({ ...context, Description: '', Workspace: null }, null, dataPath).description).toBe('');
});

it('uses a directly addressed Layout as the context', () => {
  expect(buildPageMetadata({ ...context, Type: 'Layout', ...page, MetaTitle: 'Static page' }, null, dataPath))
    .toEqual({ title: 'Static page', description: 'Layout description', robots: 'nofollow' });
});

it('does not publish Layout metadata while its context has not resolved', () => {
  expect(buildPageMetadata(null, page, dataPath)).toEqual({ title: '', description: '', robots: '' });
});

it('turns repository HTML into readable text without running embedded content', () => {
  expect(metadataText('<p>Árnyék &amp; fény</p><p>Második<br>sor &quot;idézet&quot;.</p>'))
    .toBe('Árnyék & fény Második sor "idézet".');
  expect(metadataText('Before<div title="a > b">after <span>text</span></div>end'))
    .toBe('Before after text end');
  expect(metadataText('<script>window.__seoExecuted = true</script><style>p{color:red}</style><p>Safe text</p>'))
    .toBe('Safe text');
  expect(window.__seoExecuted).toBeUndefined();
});
