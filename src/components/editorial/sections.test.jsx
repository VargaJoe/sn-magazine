import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { useRepository } from '@sensenet/hooks-react';
import { useSnStore } from '../store/sn-store';
import { EditorialIntro, EditorialNote, EditorialNavigation, EditorialFeature,
  EditorialReadingFeature, EditorialReading, EditorialStories, EditorialTimeline,
  EditorialTopics } from './sections';
import { contentRoute, coverUrl, publishedDate, translationTarget } from './repository';
import EditorialFlowPage from '../layouts/page-editorial-flow';

jest.mock('@sensenet/hooks-react', () => ({ useRepository: jest.fn() }));

const rootPath = '/Root/Content/example';
const article = { Id: 10, Path: `${rootPath}/journal/first`, Type: 'LeisureArticle',
  DisplayName: 'An actual article', Lead: '<p>A real <b>lead</b>.</p>',
  PublishDate: '2026-02-15T12:00:00Z' };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('native editorial sections', () => {
  let root;
  let container;
  let repository;
  const originalEnvironment = { root: process.env.REACT_APP_DATA_PATH,
    api: process.env.REACT_APP_API_URL, logo: process.env.REACT_APP_LOGO_PATH,
    act: global.IS_REACT_ACT_ENVIRONMENT };

  const render = async content => {
    await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true,
      v7_relativeSplatPath: true }}>{content}</MemoryRouter>));
  };
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    process.env.REACT_APP_DATA_PATH = rootPath;
    process.env.REACT_APP_API_URL = 'https://repository.example';
    process.env.REACT_APP_LOGO_PATH = '/assets/logo.svg';
    useSnStore.setState({ context: { Id: 1, Type: 'Workspace', Path: rootPath,
      DisplayName: 'Example journal', Workspace: { Path: rootPath, DisplayName: 'Example journal' } } });
    repository = { load: jest.fn().mockResolvedValue({ d: article }),
      loadCollection: jest.fn().mockResolvedValue({ d: { results: [article] } }) };
    useRepository.mockReturnValue(repository);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  afterAll(() => {
    [['REACT_APP_DATA_PATH', originalEnvironment.root], ['REACT_APP_API_URL', originalEnvironment.api],
      ['REACT_APP_LOGO_PATH', originalEnvironment.logo]].forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    });
    global.IS_REACT_ACT_ENVIRONMENT = originalEnvironment.act;
  });

  it('renders native text fields safely without repository requests or invented content', async () => {
    await render(<><EditorialIntro widget={{ Title: 'Welcome', ComponentContent: '<p>Editor <b>words</b>.</p><p>A second paragraph.</p><script>bad()</script>' }} />
      <EditorialNote widget={{ Title: 'A note', ComponentContent: '<p>More words</p>' }} /></>);
    expect(container.querySelector('h1').textContent).toBe('Welcome');
    expect(container.querySelector('h2').textContent).toBe('A note');
    expect(container.textContent).toContain('Editor words.');
    expect(container.querySelectorAll('.ed-intro > p')).toHaveLength(2);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('bad()');
    expect(repository.load).not.toHaveBeenCalled();
    expect(repository.loadCollection).not.toHaveBeenCalled();
  });

  it('loads bounded child collections using native site binding, query and expansion', async () => {
    await render(<EditorialStories widget={{ Id: 20, Title: 'Journal', ContextBinding: ['currentsite'],
      ChildrenLevel: ['child'], ContentQuery: 'TypeIs:LeisureArticle', Expand: 'Image' }} />);
    const request = repository.loadCollection.mock.calls[0][0];
    expect(request).toMatchObject({ path: rootPath, oDataOptions: { select: 'all',
      expand: 'Workspace,Image', query: `(TypeIs:LeisureArticle) AND InFolder:'${rootPath}'`,
      enableautofilters: 'on', enablelifespanfilter: 'on', top: 40 } });
    expect(request.requestInit.signal).toBeInstanceOf(AbortSignal);
    expect(container.querySelectorAll('article')).toHaveLength(1);
    expect(container.querySelector('article h3 a').getAttribute('href')).toBe('/journal/first');
    expect(container.querySelector('article p').textContent).toBe('A real lead.');
    expect(container.querySelector('time').getAttribute('datetime')).toBe(article.PublishDate);
    expect(container.querySelector('img')).toBeNull();
  });

  it('preserves deep query directives and reloads when native widget configuration changes', async () => {
    const widget = { Id: 20, ContextBinding: ['customroot'], CustomRoot: { Path: `${rootPath}/journal` },
      ChildrenLevel: ['deep'], ContentQuery: 'TypeIs:LeisureArticle .REVERSESORT:PublishDate .TOP:6' };
    await render(<EditorialTimeline widget={widget} />);
    expect(repository.loadCollection.mock.calls[0][0]).toMatchObject({ path: `${rootPath}/journal`,
      oDataOptions: { query: widget.ContentQuery } });
    await render(<EditorialTimeline widget={{ ...widget, CustomRoot: { Path: `${rootPath}/essays` },
      ContentQuery: 'TypeIs:LeisureArticle .TOP:2', Expand: 'Image' }} />);
    expect(repository.loadCollection).toHaveBeenCalledTimes(2);
    expect(repository.loadCollection.mock.calls[1][0]).toMatchObject({ path: `${rootPath}/essays`,
      oDataOptions: { query: 'TypeIs:LeisureArticle .TOP:2', expand: 'Workspace,Image' } });
  });

  it('resolves a relative root before honoring its SmartFolder query', async () => {
    repository.load.mockResolvedValue({ d: { Path: `${rootPath}/selected`, Type: 'SmartFolder' } });
    await render(<EditorialTopics widget={{ RelativePath: '/selected', ChildrenLevel: ['deep'],
      ContentQuery: 'This must not replace the SmartFolder query' }} />);
    expect(repository.load.mock.calls[0][0].idOrPath).toBe(`${rootPath}/selected`);
    expect(repository.loadCollection.mock.calls[0][0].path).toBe(`${rootPath}/selected`);
    expect(repository.loadCollection.mock.calls[0][0].oDataOptions).not.toHaveProperty('query');
    expect(container.querySelector('.ed-topic').getAttribute('href')).toBe('/journal/first');
  });

  it('does not request children for none or an invalid root', async () => {
    await render(<EditorialStories widget={{ ChildrenLevel: ['none'] }} />);
    expect(container.textContent).toContain('Még nincs megjeleníthető tartalom.');
    await render(<EditorialStories widget={{ ContextBinding: ['customroot'], CustomRoot: {
      Path: '/Root/Content/another-site' } }} />);
    expect(repository.loadCollection).not.toHaveBeenCalled();
    expect(repository.load).not.toHaveBeenCalled();
  });

  it('clears prior results on navigation and ignores a late request from the previous context', async () => {
    const first = deferred();
    const second = deferred();
    repository.loadCollection.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await render(<EditorialStories widget={{ Title: 'Stories' }} />);
    await act(async () => useSnStore.setState({ context: { Id: 2, Path: `${rootPath}/next` } }));
    await act(async () => second.resolve({ d: { results: [{ ...article, DisplayName: 'New context article' }] } }));
    expect(container.textContent).toContain('New context article');
    await act(async () => first.resolve({ d: { results: [article] } }));
    expect(container.textContent).not.toContain('An actual article');
    expect(container.textContent).toContain('New context article');
    const third = deferred();
    repository.loadCollection.mockReturnValueOnce(third.promise);
    await act(async () => useSnStore.setState({ context: { Id: 3, Path: `${rootPath}/third` } }));
    expect(container.textContent).not.toContain('New context article');
    expect(container.textContent).toContain('Betöltés…');
    await act(async () => third.reject(new Error('Unavailable')));
    expect(container.textContent).toContain('A tartalom most nem tölthető be.');
  });

  it('bounds a stalled request and displays a normal error', async () => {
    jest.useFakeTimers();
    repository.load.mockReturnValue(new Promise(() => {}));
    await render(<EditorialFeature widget={{ Title: 'Featured' }} />);
    await act(async () => jest.advanceTimersByTime(15000));
    expect(repository.load.mock.calls[0][0].requestInit.signal.aborted).toBe(true);
    expect(container.textContent).toContain('A tartalom most nem tölthető be.');
  });

  it('loads one configured work, chooses its first public translation by numeric Index, and links both actions', async () => {
    const work = { ...article, Type: 'LeisureMangaReview', Path: `${rootPath}/works/example`,
      Translation: { results: [
        { Path: `${rootPath}/read/hidden`, Index: 0, Hidden: true },
        { Path: `${rootPath}/read/tenth`, Index: '10' },
        { Path: '/Root/Content/another-site/read/first', Index: 0 },
        { Path: `${rootPath}/read/second`, Index: '2' },
      ] } };
    repository.load.mockResolvedValue({ d: work });
    await render(<EditorialReadingFeature widget={{ Title: 'Selected work', ContextBinding: ['customroot'],
      CustomRoot: { Path: work.Path }, Expand: 'Image' }} />);
    expect(repository.load.mock.calls[0][0]).toMatchObject({ idOrPath: work.Path,
      oDataOptions: { expand: 'Workspace,Image,Translation' } });
    expect(container.querySelector('.ed-actions a').getAttribute('href')).toBe('/works/example');
    expect(container.querySelector('.ed-action-reading').getAttribute('href')).toBe('/read/second');
    expect(container.querySelector('.ed-action-reading').textContent).toBe('Első fejezet');
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelectorAll('h3')).toHaveLength(1);
    repository.loadCollection.mockResolvedValue({ d: { results: [work, { ...article,
      Id: 50, Type: 'LeisureMangaTranslation', Path: `${rootPath}/read/chapter`, DisplayName: 'A chapter' }] } });
    await render(<EditorialReading widget={{ Title: 'Reading' }} />);
    expect(container.querySelectorAll('.ed-work')).toHaveLength(1);
    expect(container.textContent).not.toContain('A chapter');
  });

  it('uses the native first chapter reader URL before its download URL', async () => {
    const work = { ...article, Translation: [{ Path: `${rootPath}/read/first`, Index: 1,
      ReaderUrl: 'https://reader.example/read/first#page/1', Url: 'https://files.example/first.zip' }] };
    repository.load.mockResolvedValue({ d: work });
    await render(<EditorialReadingFeature widget={{ Id: 60, Title: 'Read a work' }} />);
    const action = container.querySelector('.ed-action-reading');
    expect(action.href).toBe('https://reader.example/read/first#page/1');
    expect(action.textContent).toBe('Olvasás az elejétől');
    expect(action.target).toBe('_blank');
    expect(action.rel).toContain('noopener');
  });

  it('labels native download links accurately and rejects unsafe reading URLs', () => {
    const path = `${rootPath}/read/first`;
    expect(translationTarget({ Path: path, Url: 'https://files.example/first.zip' }))
      .toEqual({ href: 'https://files.example/first.zip', label: 'Első fejezet letöltése', external: true });
    expect(translationTarget({ Path: path, ReaderUrl: 'javascript:alert(1)', Url: 'https://user:secret@files.example/a' }))
      .toEqual({ href: '/read/first', label: 'Első fejezet', external: false });
    expect(translationTarget({ Path: '/Root/Content/another-site/first', ReaderUrl: 'data:text/html,hello' })).toBeNull();
  });

  it('renders site branding, category navigation, and distinct semantic section structures', async () => {
    repository.loadCollection.mockResolvedValue({ d: { results: [{ Id: 50,
      Path: `${rootPath}/journal`, DisplayName: 'Journal', Type: 'LeisureCategory' }, article] } });
    await render(<><EditorialNavigation widget={{ Title: 'Explore' }} /><EditorialIntro widget={{ Title: 'Home' }} />
      <EditorialStories widget={{ Title: 'Stories' }} /><EditorialTimeline widget={{ Title: 'Notes' }} />
      <EditorialTopics widget={{ Title: 'Topics' }} /></>);
    expect(container.querySelector('.ed-navigation a[aria-label="Főoldal"]').getAttribute('href')).toBe('/');
    expect(container.querySelector('.ed-logo').src).toBe('https://repository.example/Root/Content/example/assets/logo.svg');
    expect(container.querySelector('nav[aria-label="Explore"] a').getAttribute('href')).toBe('/journal');
    expect(container.querySelector('.ed-navigation').textContent).toContain('Example journal');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('.ed-story-grid article')).not.toBeNull();
    expect(container.querySelector('.ed-timeline-list .ed-timeline-item article')).not.toBeNull();
    expect(container.querySelector('.ed-topic-list .ed-topic')).not.toBeNull();
    expect(container.querySelector('[class*="w3-"]')).toBeNull();
  });

  it('composes native Widget zones and reflects changed section placement without nested landmarks', async () => {
    const widget = (Id, ClientComponent, PortletZone, Title) => ({
      Id, Type: 'WidgetContentView', ClientComponent, PortletZone, Title,
    });
    const navigation = { ...widget(1, 'editorial-navigation', 'header', 'Explore'), Type: 'WidgetContentCollection' };
    const intro = widget(2, 'editorial-intro', 'main', 'Main introduction');
    const note = widget(3, 'editorial-note', 'main', 'Editor selection');
    const footer = widget(4, 'editorial-note', 'footer', 'Footer note');
    useSnStore.setState({ widgets: [navigation, intro, note, footer] });
    await render(<EditorialFlowPage />);
    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(container.querySelector('header .ed-navigation')).not.toBeNull();
    expect(container.querySelector('header header')).toBeNull();
    expect(container.querySelector('main h1').textContent).toBe('Main introduction');
    expect(container.querySelector('main .ed-note').textContent).toBe('Editor selection');
    expect(container.querySelector('footer').textContent).toBe('Footer note');
    await act(async () => useSnStore.setState({ widgets: [navigation, intro,
      { ...note, PortletZone: 'footer', Title: 'Moved editor note' }, footer] }));
    expect(container.querySelector('main .ed-note')).toBeNull();
    expect(container.querySelector('footer').textContent).toContain('Moved editor note');
  });

  it('rejects unsafe or unrelated paths and images, hides sentinel dates, and handles missing fields', async () => {
    expect(contentRoute({ Path: `${rootPath}/../outside` })).toBe('');
    expect(contentRoute({ Path: `${rootPath}/%2foutside` })).toBe('');
    expect(contentRoute({ Path: `${rootPath}-other/article` })).toBe('');
    expect(contentRoute({ Path: `${rootPath}/a readable (title)` })).toBe('/a%20readable%20(title)');
    expect(coverUrl({ Image: { Url: 'https://external.example/cover.jpg' } })).toBe('');
    expect(coverUrl({ Image: { Url: 'javascript:alert(1)' } })).toBe('');
    expect(coverUrl({ ImageData: '/binaryhandler.ashx?nodeid=10' })).toBe('https://repository.example/binaryhandler.ashx?nodeid=10');
    expect(publishedDate('0001-01-01T00:00:00Z')).toBeNull();
    expect(publishedDate('2026-02-31T00:00:00Z')).toBeNull();
    repository.load.mockResolvedValue({ d: { Path: article.Path, DisplayName: 'Minimal article' } });
    await render(<EditorialFeature />);
    expect(container.textContent).toContain('Minimal article');
    expect(container.textContent).not.toMatch(/undefined|Invalid date/);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('time')).toBeNull();
  });
});
