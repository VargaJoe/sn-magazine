import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import AnalyticsTracker from './AnalyticsTracker';

const workspace = { Id: 1, DisplayName: 'Leisure Magazin' };
const article = {
  Id: 3,
  Path: '/Root/Content/Magazine/books/review',
  DisplayName: 'Árnyék és fény',
  Workspace: workspace,
};

describe('resolved page analytics', () => {
  let container;
  let root;
  let navigate;
  let observedTitles;
  let observedDescriptions;
  const originalDataPath = process.env.REACT_APP_DATA_PATH;
  const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;

  function NavigationControl() {
    navigate = useNavigate();
    return null;
  }

  async function render(context, path = '/books/review', options = {}) {
    await act(async () => {
      root.render(
        <StrictMode>
          <HelmetProvider>
            <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <NavigationControl />
              <AnalyticsTracker context={context} {...options} />
            </MemoryRouter>
          </HelmetProvider>
        </StrictMode>,
      );
    });
  }

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    process.env.REACT_APP_DATA_PATH = '/Root/Content/Magazine';
    document.title = 'Initial title';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    observedTitles = [];
    observedDescriptions = [];
    window.dataLayer = [];
    jest.spyOn(window.dataLayer, 'push').mockImplementation(event => {
      observedTitles.push(document.title);
      observedDescriptions.push([...document.head.querySelectorAll('meta[name="description" i]')].map(node => node.content));
      return Array.prototype.push.call(window.dataLayer, event);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete window.dataLayer;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
    if (originalDataPath === undefined) delete process.env.REACT_APP_DATA_PATH;
    else process.env.REACT_APP_DATA_PATH = originalDataPath;
  });

  it.each([
    ['home', { ...article, Id: 1, DisplayName: 'Leisure Magazin' }, '/', 'Leisure Magazin'],
    ['root without expanded Workspace', {
      ...article, Path: '/Root/Content/Magazine/', DisplayName: 'Leisure Magazin', Workspace: null,
    }, '/', 'Leisure Magazin'],
    ['section', { ...article, DisplayName: 'Könyvek' }, '/books', 'Leisure Magazin - Könyvek'],
    ['article', article, '/books/review', 'Leisure Magazin - Árnyék és fény'],
  ])('sets the direct %s title before dataLayer observers run', async (_, context, path, title) => {
    await render(context, path);

    expect([...window.dataLayer]).toEqual([{ event: 'react_page_view', page_title: title, page_path: path, page_type: 'content' }]);
    expect(observedTitles).toEqual([title]);
    expect(document.title).toBe(title);
    expect(document.querySelector('meta[property="og:title"]').content).toBe(title);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(new URL(document.querySelector('link[rel="canonical"]').href).pathname).toBe(path);
  });

  it('uses the same resolved SEO title for the browser, Open Graph and analytics', async () => {
    await render({ ...article, MetaTitle: 'Unique article title', MetaDescription: '<p>&nbsp;</p>' },
      '/books/review', { page: {
        MetaTitle: 'Shared title', MetaDescription: '<p>Shared &amp; readable description</p>',
        MetaRobots: 'noindex, follow',
      } });
    expect(document.title).toBe('Unique article title');
    expect(observedTitles).toEqual(['Unique article title']);
    expect(window.dataLayer[0].page_title).toBe('Unique article title');
    expect(document.querySelector('meta[property="og:title"]').content).toBe('Unique article title');
    expect(document.querySelector('meta[name="description"]').content).toBe('Shared & readable description');
    expect(document.querySelector('meta[property="og:description"]').content).toBe('Shared & readable description');
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, follow');
  });

  it.each(['description', 'Description'])('replaces a static %s tag before publishing the page view', async name => {
    const fallback = document.createElement('meta');
    fallback.name = name;
    fallback.content = 'Static site description';
    document.head.appendChild(fallback);
    try {
      await render({ ...article, MetaDescription: 'Article SEO description' });
      const descriptions = [...document.head.querySelectorAll('meta[name="description" i]')];
      expect(descriptions.map(node => node.content)).toEqual(['Article SEO description']);
      expect(observedDescriptions).toEqual([['Article SEO description']]);
      expect(document.querySelector('meta[property="og:description"]').content).toBe('Article SEO description');
    } finally {
      fallback.remove();
    }
  });

  it('keeps one description across loading, metadata updates, error and legacy recovery', async () => {
    const first = document.createElement('meta');
    first.name = 'description';
    first.content = 'Static default';
    const duplicate = first.cloneNode();
    const unrelated = document.createElement('meta');
    unrelated.name = 'author';
    unrelated.content = 'Existing author';
    document.head.append(first, duplicate, unrelated);
    const descriptions = () => [...document.head.querySelectorAll('meta[name="description" i]')].map(node => node.content);
    try {
      await render(null);
      expect(descriptions()).toEqual(['Static default', 'Static default']);
      await render({ ...article, MetaDescription: 'Article SEO' });
      expect(descriptions()).toEqual(['Article SEO']);
      await render({ ...article, MetaDescription: 'Updated SEO' });
      expect(descriptions()).toEqual(['Updated SEO']);
      await render(null, '/missing', { pageType: 'not_found', pageTitle: 'Missing page' });
      expect(descriptions()).toEqual(['']);
      expect(document.querySelector('meta[name="robots"]').content).toBe('noindex');
      await render({ ...article, Description: '<p>Legacy description</p>' });
      expect(descriptions()).toEqual(['Legacy description']);
      expect(document.querySelector('meta[name="robots"]')).toBeNull();
      expect(unrelated.isConnected).toBe(true);
      expect(unrelated.content).toBe('Existing author');
    } finally {
      first.remove();
      duplicate.remove();
      unrelated.remove();
    }
  });

  it('removes a previous Layout robots value when navigation resolves legacy metadata', async () => {
    await render(article, '/books/review', { page: { MetaRobots: 'noindex' } });
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex');
    await act(async () => navigate('/other'));
    await render({ ...article, Description: 'Other description' });
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('meta[name="description"]').content).toBe('Other description');
    expect(window.dataLayer).toHaveLength(2);
  });

  it.each(['not_found', 'error'])('keeps the system noindex and title on %s views', async pageType => {
    await render({ ...article, MetaTitle: 'Content SEO title', MetaRobots: 'index, follow' },
      '/missing', { pageType, pageTitle: 'System status title', page: { MetaRobots: 'all' } });
    expect(document.title).toBe('System status title');
    expect(window.dataLayer[0].page_title).toBe('System status title');
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex');
    expect(!!document.querySelector('link[rel="canonical"]')).toBe(pageType !== 'not_found');
  });

  it('waits for context and emits once across StrictMode, rerenders, and refreshed content', async () => {
    await render(null);
    expect(window.dataLayer).toHaveLength(0);
    expect(document.title).toBe('Initial title');

    await render(article);
    await render({ ...article, Workspace: { ...workspace } });
    await render({ ...article, DisplayName: 'Updated review' });

    expect(window.dataLayer).toHaveLength(1);
    expect(observedTitles).toEqual(['Leisure Magazin - Árnyék és fény']);
    expect(document.title).toBe('Leisure Magazin - Updated review');
  });

  it('creates dataLayer before GTM is available', async () => {
    delete window.dataLayer;
    await render(article);
    expect(window.dataLayer).toEqual([{
      event: 'react_page_view', page_title: 'Leisure Magazin - Árnyék és fény', page_path: '/books/review', page_type: 'content',
    }]);
  });

  it('preserves an existing GTM queue', async () => {
    const layer = window.dataLayer;
    layer.push({ event: 'gtm.js' });
    await render(article);
    expect(window.dataLayer).toBe(layer);
    expect(layer).toHaveLength(2);
    expect(layer[0]).toEqual({ event: 'gtm.js' });
    expect(layer[1].event).toBe('react_page_view');
  });

  it('counts query, hash, repeated URL, back, and forward navigations once each', async () => {
    await render(article);
    for (const destination of [
      '/books/review?sort=new',
      '/books/review?sort=new#details',
      '/books/review?sort=new#details',
      -1,
      1,
    ]) {
      await act(async () => navigate(destination));
    }

    expect(window.dataLayer).toHaveLength(6);
    expect(window.dataLayer.map(event => event.page_path)).toEqual(Array(6).fill('/books/review'));
    expect(observedTitles).toEqual(Array(6).fill('Leisure Magazin - Árnyék és fény'));
  });

  it.each([
    ['missing context', null],
    ['missing Workspace', { ...article, Workspace: null }],
    ['missing site name', { ...article, Workspace: { Id: 1 } }],
    ['blank site name', { ...article, Workspace: { ...workspace, DisplayName: '  ' } }],
    ['placeholder site name', { ...article, Workspace: { ...workspace, DisplayName: 'W3.CSS Template' } }],
    ['missing article title', { ...article, DisplayName: undefined }],
    ['blank article title', { ...article, DisplayName: '  ' }],
    ['undefined article title', { ...article, DisplayName: 'undefined' }],
    ['null article title', { ...article, DisplayName: 'null' }],
    ['template article title', { ...article, DisplayName: 'W3.CSS Template' }],
    ['non-string article title', { ...article, DisplayName: 42 }],
  ])('does not publish a page view for %s', async (_, context) => {
    await render(context);
    expect(window.dataLayer).toHaveLength(0);
    expect(document.title).toBe('Initial title');
  });
});
