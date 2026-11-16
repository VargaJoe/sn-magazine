import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { useMagazine } from './provider';
import { publishedItems } from './model';
import { createEditorialLayer } from './editorial-layer';
import { MagazineArchive, MagazineArticle, MagazineBooks, MagazineNews, MagazineStart, MagazineCollections, editorialRecommendations } from './sections';
import DisqusCommentsWidget from '../widgets/manual-plugin-disqus';

jest.mock('./provider', () => ({
  ...jest.requireActual('./provider'), useMagazine: jest.fn(),
}));
jest.mock('../editorial/repository', () => ({
  ...jest.requireActual('../editorial/repository'), useEditorialContent: jest.fn(() => ({ items: [], loading: false })),
}));
jest.mock('../widgets/manual-plugin-disqus', () => ({ __esModule: true,
  default: jest.fn(() => <div>Comments mounted</div>),
}));

const siteRoot = '/Root/Content/Magazine';
const booksPath = `${siteRoot}/Books`;
const category = { Id: 100, Type: 'LeisureCategory', Path: booksPath, DisplayName: 'Books' };
const cinema = { Id: 101, Type: 'LeisureCategory', Path: `${siteRoot}/Cinema`, DisplayName: 'Cinema' };
const item = (Id, fields = {}) => ({ Id, Type: 'LeisureBookReview', Path: `${booksPath}/review-${Id}`,
  DisplayName: `Review ${Id}`, PublishDate: '2025-01-01T12:00:00Z', ...fields });
const annotation = (Id, fields = {}) => ({ Id: Id + 1000, Target: { Id }, ...fields });
const headings = container => [...container.querySelectorAll('h3')].map(heading => heading.textContent);

describe('magazine reader workflows', () => {
  let container, root, state;
  const originalEnv = { root: process.env.REACT_APP_DATA_PATH, comments: process.env.REACT_APP_DISQUS_SHORTNAME };
  const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
  // This helper uses ReactDOM directly; it needs act and is not a Testing Library render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  const render = async element => act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{element}</MemoryRouter>));
  const click = async button => act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const change = async (select, value) => act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  beforeEach(() => {
    process.env.REACT_APP_DATA_PATH = siteRoot;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    state = { context: { Id: 900, Path: `${siteRoot}/Archive`, DisplayName: 'Archive' },
      categories: [category, cinema], stories: [], articles: [], annotations: [], items: [],
      source: {}, routeFor: () => '', loading: false, error: false };
    useMagazine.mockImplementation(() => state);
    DisqusCommentsWidget.mockImplementation(() => <div>Comments mounted</div>);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });
  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalAct;
    for (const [key, value] of Object.entries({ REACT_APP_DATA_PATH: originalEnv.root, REACT_APP_DISQUS_SHORTNAME: originalEnv.comments })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  test('opt-in article context and recommendations do not borrow legacy series or numbering', async () => {
    const current = item(1, { Series: 'Legacy-only series', Body: '<p>Review body</p>' });
    const legacyMatch = item(2, { Series: 'Legacy-only series', DisplayName: 'Unrelated legacy match' });
    const editorialRoot = `${siteRoot}/(editorial)`;
    const subject = { Id: 800, Type: 'EditorialItem', Path: `${editorialRoot}/items/one`,
      DisplayName: 'Verified subject', IsListed: true, ItemScope: ['edition'], MediaKind: ['book'] };
    const link = { Id: 801, Type: 'EditorialAnnotation', Path: `${editorialRoot}/annotation`,
      Target: [current], Items: [subject] };
    state = { ...state, root: siteRoot, context: current, stories: [current, legacyMatch], articles: [current, legacyMatch],
      annotations: [annotation(1, { Series: 'Legacy-only series', SequenceNumber: 99 })],
      editorial: createEditorialLayer({ root: siteRoot, editorialRoot, items: [subject], annotations: [link], articles: [current, legacyMatch] }) };
    await render(<MagazineArticle />);
    expect(container.textContent).toContain('Verified subject');
    expect(container.textContent).not.toContain('Legacy-only series');
    expect(container.querySelector('.rm-series-box:not(.rm-editorial-article)')).toBeNull();
    expect(container.textContent).not.toContain('Ha ez tetszett');
  });

  test('archive filters retain accurate category counts and regenerate year navigation and groups', async () => {
    state.stories = [item(1, { PublishDate: '2026-02-01T12:00:00Z' }), item(2, { PublishDate: '2024-02-01T12:00:00Z' }),
      item(3, { Path: `${cinema.Path}/review`, PublishDate: '2025-02-01T12:00:00Z' })];
    await render(<MagazineArchive />);
    const filter = [...container.querySelectorAll('[aria-label="Rovatszűrő"] button')];
    expect(filter.map(button => button.textContent)).toEqual(['Összes (3)', 'Books (2)', 'Cinema (1)']);
    expect([...container.querySelectorAll('nav[aria-label="Évek"] button')].map(button => button.textContent)).toEqual(['Minden év', '2026', '2025', '2024']);
    await click([...container.querySelectorAll('nav[aria-label="Évek"] button')].find(button => button.textContent === '2024'));
    expect(headings(container)).toEqual(['Review 2']);
    await click(container.querySelector('nav[aria-label="Évek"] button'));
    await click(filter[2]);
    expect(filter[2].getAttribute('aria-pressed')).toBe('true');
    expect(headings(container)).toEqual(['Review 3']);
    expect([...container.querySelectorAll('nav[aria-label="Évek"] button')].map(button => button.textContent)).toEqual(['Minden év', '2025']);
    expect(container.querySelectorAll('ol li')).toHaveLength(1);
    expect(filter[1].textContent).toBe('Books (2)');
    await click(filter[0]);
    expect(headings(container)).toEqual(['Review 1', 'Review 3', 'Review 2']);
  });

  test('legacy groups remain readable without manufacturing a URL for an unconfigured native hub', async () => {
    state.context = { Id: 901, Path: `${siteRoot}/Collections`, DisplayName: 'Collections' };
    state.stories = [item(1, { Series: 'New sequence' }), item(2, { Series: 'New sequence' })];
    state.items = [{ Id: 999, Type: 'SmartFolder', Path: `${siteRoot}/Collections/hidden`, DisplayName: 'New sequence', Hidden: true }];
    await render(<MagazineCollections />);
    const link = [...container.querySelectorAll('a')].find(node => node.textContent === 'New sequence');
    expect(link).toBeUndefined();
    expect(container.textContent).toContain('New sequence');
    expect([...container.querySelectorAll('a')].some(node => /#(?:series|author|collection)=/.test(node.getAttribute('href')))).toBe(false);
    expect(headings(container)).toEqual(['Review 1', 'Review 2']);
  });

  test('the news block disappears when only stale or hidden news exists', async () => {
    const now = Date.parse('2026-06-01T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const newsRoot = `${siteRoot}/News`;
    state.source = { NewsRoot: [{ Path: newsRoot }], NewsWindowDays: 30 };
    state.articles = publishedItems([item(1, { Path: `${newsRoot}/old`, PublishDate: '2025-01-01T12:00:00Z' }),
      item(2, { Path: `${newsRoot}/hidden`, Hidden: true, PublishDate: '2026-05-31T12:00:00Z' })], siteRoot, now);
    await render(<MagazineNews widget={{ Title: 'News' }} />);
    expect(container.textContent).toBe('');
    state.articles = [...state.articles, item(3, { Path: `${newsRoot}/recent`, PublishDate: '2026-05-31T12:00:00Z' })];
    await render(<MagazineNews widget={{ Title: 'News' }} />);
    expect(headings(container)).toEqual(['Review 3']);
  });

  test('recent legacy repository dates appear in news consistently with the published catalogue', async () => {
    const now = Date.parse('2026-06-01T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    state.source = { NewsRoot: { Path: `${siteRoot}/News` }, NewsWindowDays: 30 };
    state.articles = publishedItems([item(1, { Path: `${siteRoot}/News/recent`, PublishDate: `/Date(${now - 86400000})/` })], siteRoot, now);
    expect(state.articles).toHaveLength(1);
    await render(<MagazineNews widget={{ Title: 'News' }} />);
    expect(headings(container)).toEqual(['Review 1']);
  });

  test('start-here annotations cannot expose hidden or not-yet-published targets from the raw catalogue', async () => {
    const visible = item(1);
    const hidden = item(2, { Hidden: true });
    const future = item(3, { PublishDate: '9999-01-01T00:00:00Z' });
    state.items = [visible, hidden, future];
    state.stories = publishedItems(state.items, siteRoot);
    state.articles = state.stories;
    state.annotations = state.items.map(target => ({ Id: target.Id + 1000, Target: target, StartHere: true }));
    await render(<MagazineStart widget={{ Title: 'Start here' }} />);
    expect(headings(container)).toEqual(['Review 1']);
  });

  test('books with missing sequence stay in an explicit unplaced section', async () => {
    state.context = category;
    state.stories = [item(1), item(2)];
    state.annotations = [annotation(1, { OriginalSequence: 1 })];
    await render(<MagazineBooks />);
    await change(container.querySelector('select'), 'original');
    expect(container.querySelector('.rm-unplaced h2').textContent).toBe('Ebben a sorrendben nincs besorolva');
    expect(headings(container.querySelector('.rm-unplaced'))).toEqual(['Review 2']);
    expect(headings(container).filter(title => title === 'Review 1')).toHaveLength(1);
  });

  test('selecting original sequence preserves the sequence rather than re-sorting by publication date', async () => {
    state.context = category;
    state.stories = [item(2, { PublishDate: '2026-01-01T12:00:00Z' }), item(1, { PublishDate: '2024-01-01T12:00:00Z' })];
    state.annotations = [annotation(1, { OriginalSequence: 1 }), annotation(2, { OriginalSequence: 2 })];
    await render(<MagazineBooks />);
    await change(container.querySelector('select'), 'original');
    expect(headings(container)).toEqual(['Review 1', 'Review 2']);
  });

  test('article recommendations and latest list exclude current and already recommended items; comments start closed', async () => {
    process.env.REACT_APP_DISQUS_SHORTNAME = 'example-comments';
    const current = item(1, { Tags: 'shared-topic', Body: '<p>Article body.</p>' });
    const related = item(2, { Tags: 'shared-topic' });
    const latest = item(3);
    state.context = current;
    state.stories = [current, related, latest];
    state.items = state.stories;
    state.annotations = [annotation(1, { SequenceNumber: 1 }), annotation(2, { SequenceNumber: 2 })];
    await render(<MagazineArticle widget={{}} />);
    const relatedSection = [...container.querySelectorAll('h2')].find(heading => heading.textContent === 'Ha ez tetszett').closest('section');
    const latestSection = [...container.querySelectorAll('h2')].find(heading => heading.textContent === 'Legfrissebb a rovatban').closest('section');
    expect(headings(relatedSection)).toEqual(['Review 2']);
    expect(headings(latestSection)).toEqual(['Review 3']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(DisqusCommentsWidget).not.toHaveBeenCalled();
    const comments = [...container.querySelectorAll('details')].find(details => details.querySelector('summary').textContent === 'Hozzászólások');
    expect(comments.open).toBe(false);
    await act(async () => {
      comments.open = true;
      comments.dispatchEvent(new Event('toggle', { bubbles: true }));
    });
    expect(DisqusCommentsWidget).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Comments mounted');
  });

  test.each([{ Hidden: true }, { PublishDate: '9999-01-01T00:00:00Z' }])('does not render an excluded review through the direct context fallback %#', async fields => {
    state.context = item(99, { ...fields, Body: '<p>Unpublished secret body</p>' });
    state.stories = []; state.articles = [];
    await render(<MagazineArticle />);
    expect(container.textContent).toContain('Az ismertető nem érhető el');
    expect(container.textContent).not.toContain('Unpublished secret body');
  });

  test('recommendation modes, counts and weights are generic Source settings', () => {
    const current = item(1, { Tags: 'topic' });
    const inCollection = item(2); const tagged = item(3, { Tags: 'topic' });
    const group = { Id: 800 };
    const editorial = { collectionsForArticle: article => article.Id === 3 ? [] : [group] };
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial).map(value => value.Id)).toEqual([2, 3]);
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial, { RecommendationCollectionWeight: 1, RecommendationTagWeight: 5 }).map(value => value.Id)).toEqual([3, 2]);
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial, { RecommendationMode: ['tags'] }).map(value => value.Id)).toEqual([3]);
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial, { RecommendationCount: 1 }).map(value => value.Id)).toEqual([2]);
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial, { RecommendationMode: ['none'] })).toEqual([]);
    expect(editorialRecommendations(current, [current, inCollection, tagged], editorial, { RecommendationCollectionWeight: 0, RecommendationTagWeight: 0 })).toEqual([]);
  });
});
