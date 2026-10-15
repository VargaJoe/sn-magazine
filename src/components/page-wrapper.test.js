import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RepositoryContext } from '@sensenet/hooks-react';
import PageWrapper from './page-wrapper';
import { useSnStore } from './store/sn-store';
import { clearLazyComponentCache } from './utils/add-component';

jest.mock('@sensenet/hooks-react', () => {
  const React = require('react');
  const RepositoryContext = React.createContext(null);
  return { RepositoryContext, useRepository: () => React.useContext(RepositoryContext) };
});

jest.mock('../configuration', () => ({
  maintenanceTemplate: 'maintenance',
  maintenanceSiteName: 'Maintenance site',
  maintenanceTitle: 'Temporarily unavailable',
  maintenanceText: '<p>Please try again later.</p>',
  maintenanceEmail: '',
}));

const workspace = { Id: 1, DisplayName: 'Leisure Magazin' };
const contextFor = (name = 'Review', overrides = {}) => ({
  Id: 3, Type: 'Article', Path: `/Root/Content/Magazine/${name}`, DisplayName: name,
  Workspace: workspace, IsFolder: false, ...overrides,
});
const layoutResult = (label = 'Article widget') => ({ d: { results: [
  { Id: 700, Type: 'Layout', Depth: 4, PageTemplate: 'leisure-simple' },
  { Id: 701, Type: 'WidgetSimpleText', ParentId: 700, PortletZone: 'content',
    Title: label, ComponentContent: '<p>Resolved widget content</p>' },
] } });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('PageWrapper navigation lifecycle', () => {
  let root;
  let container;
  let navigate;
  let observedTitles;
  let repository;
  let initialPath;
  let strict;
  const originalEnv = {
    REACT_APP_DATA_PATH: process.env.REACT_APP_DATA_PATH,
    REACT_APP_PAGECONTAINER_PATH: process.env.REACT_APP_PAGECONTAINER_PATH,
    REACT_APP_LAYOUT_TYPE: process.env.REACT_APP_LAYOUT_TYPE,
    REACT_APP_WIDGET_TYPE: process.env.REACT_APP_WIDGET_TYPE,
  };
  const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;

  function NavigationControl() {
    navigate = useNavigate();
    return null;
  }

  async function render(nextRepository = repository) {
    repository = nextRepository;
    const tree = (
      <HelmetProvider>
        <RepositoryContext.Provider value={repository}>
          <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavigationControl />
            <PageWrapper />
          </MemoryRouter>
        </RepositoryContext.Provider>
      </HelmetProvider>
    );
    await act(async () => root.render(strict ? <StrictMode>{tree}</StrictMode> : tree));
  }

  async function resolve(request, value) {
    await act(async () => request.resolve(value));
  }

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    process.env.REACT_APP_DATA_PATH = '/Root/Content/Magazine';
    process.env.REACT_APP_PAGECONTAINER_PATH = '/Root/Content/Magazine/(layout)';
    process.env.REACT_APP_LAYOUT_TYPE = 'Layout';
    process.env.REACT_APP_WIDGET_TYPE = 'Widget';
    useSnStore.setState({ context: null, page: null, widgets: null, layout: 'vanilla' });
    clearLazyComponentCache();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    document.title = 'Initial title';
    observedTitles = [];
    window.dataLayer = [];
    jest.spyOn(window.dataLayer, 'push').mockImplementation(event => {
      observedTitles.push(document.title);
      return Array.prototype.push.call(window.dataLayer, event);
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    repository = {
      load: jest.fn().mockResolvedValue({ d: contextFor() }),
      loadCollection: jest.fn().mockResolvedValue(layoutResult()),
    };
    initialPath = '/review';
    strict = false;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete window.dataLayer;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  it('waits for both context and inherited layout before publishing a view and rendering real widgets', async () => {
    const contextRequest = deferred();
    const layoutRequest = deferred();
    repository.load.mockReturnValue(contextRequest.promise);
    repository.loadCollection.mockReturnValue(layoutRequest.promise);

    await render();
    expect(window.dataLayer).toHaveLength(0);
    expect(repository.load).toHaveBeenCalledWith(expect.objectContaining({
      oDataOptions: { select: 'all', expand: 'Workspace' },
    }));
    await resolve(contextRequest, { d: contextFor() });
    expect(repository.loadCollection).toHaveBeenCalledTimes(1);
    expect(repository.loadCollection.mock.calls[0][0].oDataOptions.query).toContain("'/Root/Content/Magazine/Review/(layout)'");
    expect(window.dataLayer).toHaveLength(0);
    expect(document.title).toBe('Initial title');
    expect(container.textContent).not.toContain('Leisure Simple Layout');

    await resolve(layoutRequest, layoutResult());
    expect(container.textContent).toContain('Leisure Simple Layout');
    expect(container.querySelector('.widget-simpletext h1').textContent).toBe('Article widget');
    expect([...window.dataLayer]).toEqual([{
      event: 'react_page_view', page_title: 'Leisure Magazin - Review', page_path: '/review',
    }]);
    expect(observedTitles).toEqual(['Leisure Magazin - Review']);
  });

  it.each([
    ['home', '/', contextFor('Leisure Magazin', { Id: 1 }), 'Leisure Magazin'],
    ['root with no Workspace', '/', contextFor('Leisure Magazin', {
      Path: '/Root/Content/Magazine', Workspace: null,
    }), 'Leisure Magazin'],
    ['section', '/books', contextFor('Könyvek', { Type: 'Folder', IsFolder: true }), 'Leisure Magazin - Könyvek'],
    ['article', '/books/review', contextFor('Árnyék és fény'), 'Leisure Magazin - Árnyék és fény'],
  ])('publishes the direct %s context title', async (_, path, context, title) => {
    initialPath = path;
    repository.load.mockResolvedValue({ d: context });
    await render();
    expect([...window.dataLayer]).toEqual([{ event: 'react_page_view', page_title: title, page_path: path }]);
    expect(observedTitles).toEqual([title]);
    expect(container.querySelector('.widget-simpletext')).not.toBeNull();
  });

  it('publishes once under StrictMode, rerenders, and repository provider refresh', async () => {
    strict = true;
    await render();
    await render();
    const refreshedRepository = {
      load: jest.fn().mockResolvedValue({ d: contextFor('Updated review') }),
      loadCollection: jest.fn().mockResolvedValue(layoutResult('Refreshed widget')),
    };
    await render(refreshedRepository);

    expect(refreshedRepository.load).toHaveBeenCalledTimes(1);
    expect(document.title).toBe('Leisure Magazin - Updated review');
    expect(container.textContent).toContain('Refreshed widget');
    expect(window.dataLayer).toHaveLength(1);
    expect(observedTitles).toEqual(['Leisure Magazin - Review']);
  });

  it('publishes one view for each query, hash, same-URL push, back, and forward navigation', async () => {
    await render();
    for (const destination of ['/review?q=one', '/review?q=one#details', '/review?q=one#details', -1, 1]) {
      await act(async () => navigate(destination));
    }
    expect(repository.load).toHaveBeenCalledTimes(6);
    expect(repository.loadCollection).toHaveBeenCalledTimes(6);
    expect(window.dataLayer).toHaveLength(6);
    expect(window.dataLayer.map(event => event.page_path)).toEqual(Array(6).fill('/review'));
    expect(observedTitles).toEqual(Array(6).fill('Leisure Magazin - Review'));
  });

  it('ignores an old context response after a faster navigation completes', async () => {
    const oldContext = deferred();
    repository.load.mockReturnValueOnce(oldContext.promise)
      .mockResolvedValueOnce({ d: contextFor('Current review') });
    await render();
    await act(async () => navigate('/current'));
    await resolve(oldContext, { d: contextFor('Obsolete review') });

    expect(repository.loadCollection).toHaveBeenCalledTimes(1);
    expect(useSnStore.getState().context.DisplayName).toBe('Current review');
    expect([...window.dataLayer]).toEqual([{
      event: 'react_page_view', page_title: 'Leisure Magazin - Current review', page_path: '/current',
    }]);
    expect(document.title).toBe('Leisure Magazin - Current review');
  });

  it('ignores an old layout response and never publishes the old navigation', async () => {
    const oldLayout = deferred();
    repository.loadCollection.mockReturnValueOnce(oldLayout.promise)
      .mockResolvedValueOnce(layoutResult('Current widget'));
    repository.load.mockResolvedValueOnce({ d: contextFor('Obsolete review') })
      .mockResolvedValueOnce({ d: contextFor('Current review') });
    await render();
    expect(window.dataLayer).toHaveLength(0);
    await act(async () => navigate('/current'));
    await resolve(oldLayout, layoutResult('Obsolete widget'));

    expect(container.textContent).toContain('Current widget');
    expect(container.textContent).not.toContain('Obsolete widget');
    expect(useSnStore.getState().context.DisplayName).toBe('Current review');
    expect(window.dataLayer).toHaveLength(1);
    expect(observedTitles).toEqual(['Leisure Magazin - Current review']);
  });

  it('shows maintenance without a stale page view when the next context load fails', async () => {
    const failure = deferred();
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    repository.load.mockResolvedValueOnce({ d: contextFor() }).mockReturnValueOnce(failure.promise);
    await render();
    await act(async () => navigate('/unavailable'));
    expect(container.querySelector('.widget-simpletext')).toBeNull();
    await act(async () => failure.reject(new Error('Offline')));

    expect(container.textContent).toContain('Temporarily unavailable');
    expect(useSnStore.getState().context).toBeNull();
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].page_path).toBe('/review');
    expect(errorLog).toHaveBeenCalled();
  });

  it.each(['pending', 'failed'])('counts returning to a previous entry after an unpublished %s navigation', async status => {
    const interrupted = deferred();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    repository.load.mockResolvedValueOnce({ d: contextFor() }).mockReturnValueOnce(interrupted.promise);
    await render();
    await act(async () => navigate('/unavailable'));
    if (status === 'failed') {
      await act(async () => interrupted.reject(new Error('Offline')));
      expect(container.textContent).toContain('Temporarily unavailable');
    }
    expect(window.dataLayer).toHaveLength(1);

    await act(async () => navigate(-1));
    if (status === 'pending') await resolve(interrupted, { d: contextFor('Obsolete review') });

    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer.map(event => event.page_path)).toEqual(['/review', '/review']);
    expect(observedTitles).toEqual(Array(2).fill('Leisure Magazin - Review'));
    expect(container.querySelector('.widget-simpletext')).not.toBeNull();
  });

  it('keeps the automatic layout fallback and correct title on layout load failure', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    repository.loadCollection.mockRejectedValue(new Error('Layout unavailable'));
    await render();
    expect(useSnStore.getState().layout).toBe('wide');
    expect(container.textContent).toContain('Loading layout...');
    expect(observedTitles).toEqual(['Leisure Magazin - Review']);
    expect(window.dataLayer).toHaveLength(1);
  });

  it.each([
    ['missing Workspace', { Workspace: null }],
    ['invalid site name', { Workspace: { ...workspace, DisplayName: 'undefined' } }],
    ['invalid article title', { DisplayName: 'W3.CSS Template' }],
  ])('renders resolved content without an analytics event for %s', async (_, overrides) => {
    repository.load.mockResolvedValue({ d: contextFor('Review', overrides) });
    await render();
    expect(container.querySelector('.widget-simpletext')).not.toBeNull();
    expect(window.dataLayer).toHaveLength(0);
    expect(document.title).toBe('Initial title');
  });
});
