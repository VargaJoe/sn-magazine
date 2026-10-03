import { loadPresentation, parsePresentation, presentationUrl, repositoryAssetUrl } from './site-presentation';

const repository = 'https://repo.example';
const url = `${repository}/Root/Content/site/(structure)/Site/presentation.json`;
const manifest = {
  version: 1,
  stylesheets: ['skin.css', 'skin.css', '/Root/Skins/shared/base.css'],
  layouts: {
    magazine: { className: 'magazine theme-light', zones: [
      { name: 'side', className: 'navigation' }, { name: 'content' }, { name: 'footer' },
    ] },
  },
};

it('isolates conventional manifest paths for two sites and supports an override', () => {
  expect(presentationUrl(repository, '/Root/Content/alpha')).toBe(`${repository}/Root/Content/alpha/(structure)/Site/presentation.json`);
  expect(presentationUrl(repository, '/Root/Content/beta/')).toBe(`${repository}/Root/Content/beta/(structure)/Site/presentation.json`);
  expect(presentationUrl(repository, '/Root/Content/alpha', 'themes/settings.json')).toBe(`${repository}/Root/Content/alpha/themes/settings.json`);
  expect(presentationUrl(repository, '/Root/Content/alpha', '/Root/Skins/config.json')).toBe(`${repository}/Root/Skins/config.json`);
});

it('resolves CSS relative to the manifest and keeps zone order and class names', () => {
  const parsed = parsePresentation(manifest, url, repository);
  expect(parsed.stylesheets).toEqual([
    `${repository}/Root/Content/site/(structure)/Site/skin.css`, `${repository}/Root/Skins/shared/base.css`,
  ]);
  expect(parsed.layouts.magazine.zones.map(zone => zone.name)).toEqual(['side', 'content', 'footer']);
  expect(parsed.layouts.magazine.className).toBe('magazine theme-light');
});

it.each(['https://other.example/skin.css', '//other.example/skin.css', 'javascript:alert(1)', 'data:text/css,test', '/OData.svc/Root/Content', '/Root/..%2foutside.css', '/Root/..%5Coutside.css'])('rejects an asset outside repository files: %s', path => {
  expect(() => repositoryAssetUrl(path, url, repository)).toThrow();
});

it.each([
  { version: 2 }, { version: 1, stylesheets: 'skin.css' },
  { version: 1, layouts: [] },
  { version: 1, layouts: { main: { zones: [{ name: 'side' }] } } },
  { version: 1, layouts: { main: { zones: [{ name: 'content' }, { name: 'content' }] } } },
  { version: 1, layouts: { main: { zones: [{}] } } },
  { version: 1, layouts: { main: { className: '<script>', zones: [{ name: 'content' }] } } },
])('rejects invalid manifests before applying any CSS: %j', value => {
  expect(() => parsePresentation(value, url, repository)).toThrow();
});

it('loads a public repository file with revalidation and cancellation', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => manifest });
  const signal = new AbortController().signal;
  const result = await loadPresentation({ repositoryUrl: repository, sitePath: '/Root/Content/site', signal, fetchImpl });
  expect(fetchImpl).toHaveBeenCalledWith(url, { signal, credentials: 'omit', cache: 'no-cache' });
  expect(result.layouts.magazine).toBeDefined();
});

it('treats a missing manifest as legacy mode but reports other failures', async () => {
  const options = { repositoryUrl: repository, sitePath: '/Root/Content/site' };
  expect(await loadPresentation({ ...options, fetchImpl: async () => ({ status: 404 }) })).toBeNull();
  await expect(loadPresentation({ ...options, fetchImpl: async () => ({ status: 403, ok: false }) })).rejects.toThrow('403');
  await expect(loadPresentation({ ...options, fetchImpl: async () => { throw new Error('network'); } })).rejects.toThrow('network');
});
