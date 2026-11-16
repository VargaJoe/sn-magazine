import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useRepository } from '@sensenet/hooks-react';
import { loadMagazineCatalogue, MagazineProvider, useMagazine } from './provider';
import { loadEditorialData } from './editorial-loader';

jest.mock('@sensenet/hooks-react', () => ({ useRepository: jest.fn() }));
jest.mock('./editorial-loader', () => ({ loadEditorialData: jest.fn() }));

const siteRoot = '/Root/Content/Magazine';
const source = { Id: 700, ClientComponent: 'magazine-source', ContentQuery: "TypeIs:LeisureArticle" };
const item = (Id, fields = {}) => ({ Id, Type: 'LeisureArticle', Path: `${siteRoot}/Reviews/item-${Id}`,
  DisplayName: `Article ${Id}`, PublishDate: '2025-01-01T12:00:00Z', ...fields });
const page = (items, count) => ({ d: { results: items, ...(count === undefined ? {} : { __count: String(count) }) } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

describe('complete magazine catalogue requests', () => {
  test('loads every page beyond 200 items with the complete reference expansions', async () => {
    const items = Array.from({ length: 415 }, (_, index) => item(index + 1));
    const repo = { loadCollection: jest.fn(request => {
      const skip = request.oDataOptions.skip;
      return Promise.resolve(page(items.slice(skip, skip + 200), items.length));
    }) };
    const controller = new AbortController();
    await expect(loadMagazineCatalogue(repo, source, controller.signal, siteRoot)).resolves.toEqual(items);
    expect(repo.loadCollection.mock.calls.map(([request]) => request.oDataOptions.skip)).toEqual([0, 200, 400]);
    expect(repo.loadCollection).toHaveBeenCalledWith(expect.objectContaining({
      path: siteRoot, requestInit: { signal: expect.any(AbortSignal) },
      oDataOptions: expect.objectContaining({ query: source.ContentQuery, top: 200,
        expand: expect.arrayContaining(['BookAuthor', 'Target', 'RelatedContent']), enablelifespanfilter: 'on' }),
    }));
  });

  test('without a count, reads the final empty page after an exact full-page boundary', async () => {
    const items = Array.from({ length: 400 }, (_, index) => item(index + 1));
    const repo = { loadCollection: jest.fn(request => Promise.resolve(page(items.slice(request.oDataOptions.skip, request.oDataOptions.skip + 200)))) };
    await expect(loadMagazineCatalogue(repo, source, undefined, siteRoot)).resolves.toHaveLength(400);
    expect(repo.loadCollection).toHaveBeenCalledTimes(3);
  });

  test('rejects malformed and truncated pages instead of returning a partial catalogue', async () => {
    const malformed = { loadCollection: jest.fn().mockResolvedValue({ d: {} }) };
    await expect(loadMagazineCatalogue(malformed, source, undefined, siteRoot)).rejects.toThrow(/Incomplete/);
    const truncated = { loadCollection: jest.fn().mockResolvedValue(page([item(1)], 2)) };
    await expect(loadMagazineCatalogue(truncated, source, undefined, siteRoot)).rejects.toThrow(/Truncated/);
  });

  test('rejects content outside the configured root and repeated records across pagination', async () => {
    const outside = { loadCollection: jest.fn().mockResolvedValue(page([item(1, { Path: `${siteRoot}-other/review` })])) };
    await expect(loadMagazineCatalogue(outside, source, undefined, siteRoot)).rejects.toThrow(/Invalid/);
    const first = Array.from({ length: 200 }, (_, index) => item(index + 1));
    const duplicates = { loadCollection: jest.fn().mockResolvedValueOnce(page(first)).mockResolvedValueOnce(page([item(1)])) };
    await expect(loadMagazineCatalogue(duplicates, source, undefined, siteRoot)).rejects.toThrow(/Invalid/);
  });

  test('propagates a later page failure without treating the first page as complete', async () => {
    const first = Array.from({ length: 200 }, (_, index) => item(index + 1));
    const repo = { loadCollection: jest.fn().mockResolvedValueOnce(page(first)).mockRejectedValueOnce(Error('Page unavailable')) };
    await expect(loadMagazineCatalogue(repo, source, undefined, siteRoot)).rejects.toThrow('Page unavailable');
  });

  test('abort cancels the active request and prevents another page even when the transport ignores cancellation', async () => {
    const response = deferred();
    const repo = { loadCollection: jest.fn().mockReturnValue(response.promise) };
    const controller = new AbortController();
    const loading = loadMagazineCatalogue(repo, source, controller.signal, siteRoot);
    const rejected = loading.catch(error => error);
    controller.abort();
    await expect(rejected).resolves.toMatchObject({ name: 'AbortError' });
    expect(repo.loadCollection.mock.calls[0][0].requestInit.signal.aborted).toBe(true);
    response.resolve(page(Array.from({ length: 200 }, (_, index) => item(index + 1))));
    await Promise.resolve();
    expect(repo.loadCollection).toHaveBeenCalledTimes(1);
  });
});

describe('provider navigation lifecycle', () => {
  let container, root, state;
  const originalEnv = process.env.REACT_APP_DATA_PATH;
  const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
  function Probe() {
    state = useMagazine();
    return <p>{state.loading ? 'Loading' : state.error ? 'Failed' : state.articles.map(value => value.DisplayName).join(', ')}</p>;
  }
  // This helper uses ReactDOM directly; it needs act and is not a Testing Library render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  const render = async path => act(async () => root.render(<MagazineProvider context={{ Path: path }} widgets={[source]}><Probe /></MagazineProvider>));

  beforeEach(() => {
    process.env.REACT_APP_DATA_PATH = siteRoot;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useRepository.mockReset();
    loadEditorialData.mockReset();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalAct;
    if (originalEnv === undefined) delete process.env.REACT_APP_DATA_PATH;
    else process.env.REACT_APP_DATA_PATH = originalEnv;
  });

  test('clears the previous route immediately and ignores late results from an aborted navigation', async () => {
    const oldCatalogue = deferred(), oldRoles = deferred(), newCatalogue = deferred(), newRoles = deferred();
    const repo = { loadCollection: jest.fn().mockReturnValueOnce(oldCatalogue.promise).mockReturnValueOnce(newCatalogue.promise),
      load: jest.fn().mockReturnValueOnce(oldRoles.promise).mockReturnValueOnce(newRoles.promise) };
    useRepository.mockReturnValue(repo);
    await render(`${siteRoot}/first`);
    expect(state.loading).toBe(true);
    expect(repo.loadCollection).not.toHaveBeenCalled();
    await act(async () => oldRoles.resolve({ d: source }));
    await render(`${siteRoot}/second`);
    expect(state.articles).toEqual([]);
    expect(repo.loadCollection.mock.calls[0][0].requestInit.signal.aborted).toBe(true);
    // Configuration already completed; only its dependent active catalogue is cancelled.
    await act(async () => {
      newCatalogue.resolve(page([item(2, { DisplayName: 'Current article' })]));
      newRoles.resolve({ d: { ...source, ArchivePage: [{ Path: `${siteRoot}/Archive` }] } });
    });
    expect(container.textContent).toBe('Current article');
    expect(state.routeFor('ArchivePage')).toBe('/Archive');
    await act(async () => {
      oldCatalogue.resolve(page([item(1, { DisplayName: 'Obsolete article' })]));
      oldRoles.resolve({ d: { ...source, ArchivePage: [{ Path: `${siteRoot}/OldArchive` }] } });
    });
    expect(container.textContent).toBe('Current article');
    expect(state.routeFor('ArchivePage')).toBe('/Archive');
  });

  test('a failed role expansion exposes an error and never publishes a partially loaded catalogue', async () => {
    useRepository.mockReturnValue({ loadCollection: jest.fn().mockResolvedValue(page([item(1)])),
      load: jest.fn().mockRejectedValue(Error('Cannot expand configuration')) });
    await render(siteRoot);
    expect(container.textContent).toBe('Failed');
    expect(state.articles).toEqual([]);
    expect(state.items).toEqual([]);
    expect(loadEditorialData).not.toHaveBeenCalled();
  });

  test('filters hidden/future articles and separates news through expanded repository configuration', async () => {
    const newsRoot = `${siteRoot}/News`;
    useRepository.mockReturnValue({ loadCollection: jest.fn().mockResolvedValue(page([
      item(1), item(2, { Hidden: true }), item(3, { PublishDate: '9999-01-01T00:00:00Z' }),
      item(4, { Path: `${newsRoot}/notice` }),
    ])), load: jest.fn().mockResolvedValue({ d: { ...source, NewsRoot: { Path: newsRoot },
      CategoryRoots: [{ Id: 10, Path: `${siteRoot}/Reviews`, DisplayName: 'Reviews' }, { Id: 11, Path: '/Root/Elsewhere', DisplayName: 'Other' }] } }) });
    await render(siteRoot);
    expect(state.articles.map(value => value.Id)).toEqual([1, 4]);
    expect(state.stories.map(value => value.Id)).toEqual([1]);
    expect(state.categories.map(value => value.Id)).toEqual([10]);
  });

  test('opt-in loads a scoped editorial graph after public articles and preserves annotation presentation', async () => {
    const editorialRoot = { Id: 800, Type: 'Folder', Path: `${siteRoot}/(editorial)` };
    const review = item(1);
    const subject = { Id: 801, Type: 'EditorialItem', Path: `${editorialRoot.Path}/items/book`,
      DisplayName: 'A book', IsListed: true, ItemScope: ['edition'], MediaKind: ['book'] };
    const annotation = { Id: 802, Type: 'EditorialAnnotation', Path: `${siteRoot}/(structure)/Editorial/book`,
      Target: [review], Items: [subject], Featured: true };
    const repo = { loadCollection: jest.fn().mockResolvedValue(page([review])),
      load: jest.fn().mockResolvedValue({ d: { ...source, EditorialRoot: [editorialRoot] } }) };
    useRepository.mockReturnValue(repo);
    loadEditorialData.mockResolvedValue({ items: [subject], collections: [], memberships: [], annotations: [annotation] });
    await render(siteRoot);
    expect(state.error).toBeFalsy();
    expect(state.editorial.enabled).toBe(true);
    expect(state.editorial.itemViewsForArticle(review).map(row => row.item.DisplayName)).toEqual(['A book']);
    expect(state.annotations).toEqual([annotation]);
    expect(repo.load.mock.calls[0][0].oDataOptions.expand).toContain('EditorialRoot');
    expect(repo.loadCollection.mock.calls[0][0].oDataOptions.query).toBe(`+(${source.ContentQuery}) -Type:(EditorialAnnotation EditorialItem EditorialCollection EditorialMembership)`);
    expect(loadEditorialData).toHaveBeenCalledWith(repo, expect.objectContaining({ root: siteRoot,
      editorialRoot, articles: [review] }), expect.any(AbortSignal));
  });

  test('a failed opt-in never falls back to legacy fields or a partial public graph', async () => {
    useRepository.mockReturnValue({ loadCollection: jest.fn().mockResolvedValue(page([item(1, { Series: 'Legacy series' })])),
      load: jest.fn().mockResolvedValue({ d: { ...source, EditorialRoot: [{ Id: 800, Type: 'Folder', Path: `${siteRoot}/(editorial)` }] } }) });
    loadEditorialData.mockRejectedValue(Error('Cannot load second editorial page'));
    await render(siteRoot);
    expect(state.error).toBe(true);
    expect(state.editorial.enabled).toBe(true);
    expect(state.editorial.error).toBeTruthy();
    expect(state.items).toEqual([]);
    expect(state.articles).toEqual([]);
  });

  test('a source without EditorialRoot uses its existing query and does not request the new graph', async () => {
    const repo = { loadCollection: jest.fn().mockResolvedValue(page([item(1)])),
      load: jest.fn().mockResolvedValue({ d: { ...source, EditorialRoot: [] } }) };
    useRepository.mockReturnValue(repo);
    await render(siteRoot);
    expect(state.editorial).toBeNull();
    expect(repo.loadCollection.mock.calls[0][0].oDataOptions.query).toBe(source.ContentQuery);
    expect(loadEditorialData).not.toHaveBeenCalled();
  });
});
