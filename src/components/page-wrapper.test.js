import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PageWrapper from './page-wrapper';
import { useSnStore } from './store/sn-store';
import { CachedComponentsByZone } from './utils/add-component';

const mockRepository = { load: jest.fn(), loadCollection: jest.fn() };
jest.mock('@sensenet/hooks-react', () => ({ useRepository: () => mockRepository }));
jest.mock('../configuration', () => ({ maintenanceTemplate: 'maintenance' }));
jest.mock('./widgets/auto-widgetsimpletext', () => ({
  __esModule: true,
  default: ({ widget }) => <p>{widget.Title}</p>,
}));
jest.mock('./layouts/page-wide', () => ({ __esModule: true, default: () => <p>Automatic layout</p> }));
jest.mock('./layouts/page-maintenance', () => ({ __esModule: true, default: () => <p>Maintenance</p> }));

const repository = 'https://repo.example';
const site = '/Root/Content/site';
const stylesheet = name => ({ Type: 'File', Path: `/Root/Skins/${name}.css` });
const context = name => ({ Id: name === 'a' ? 1 : 2, Type: 'Article', Path: `${site}/${name}`,
  DisplayName: name, IsFolder: false, Workspace: { Id: 9, DisplayName: 'Site' } });
const pageResult = (name, Stylesheets = { results: [stylesheet(name)] }) => {
  const Id = name === 'a' ? 101 : 202;
  return { d: { results: [
    { Id: 99, Type: 'Layout', Depth: 3, PageTemplate: 'leisure-simple', Stylesheets: [stylesheet('ancestor')] },
    { Id, Type: 'Layout', Depth: 6, PageTemplate: 'leisure-simple', Stylesheets },
    { Id: 10, ParentId: Id, Type: 'WidgetSimpleText', PortletZone: 'content', Title: `${name} story` },
  ] } };
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let container, root, navigate, staticLink, previousEnvironment;
function Navigation() { navigate = useNavigate(); return null; }
const flushHead = async () => act(async () => { jest.runOnlyPendingTimers(); });
const start = async () => {
  await act(async () => root.render(
    <HelmetProvider><MemoryRouter initialEntries={['/a']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navigation /><PageWrapper />
    </MemoryRouter></HelmetProvider>,
  ));
  await flushHead();
};
const go = async path => { await act(async () => navigate(path)); await flushHead(); };
const urls = () => [...document.head.querySelectorAll('[data-sn-page-stylesheet]')].map(link => link.href);

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  previousEnvironment = { ...process.env };
  process.env.REACT_APP_API_URL = repository;
  process.env.REACT_APP_DATA_PATH = site;
  process.env.REACT_APP_PAGECONTAINER_PATH = `${site}/(layout)`;
  process.env.REACT_APP_LAYOUT_TYPE = 'Layout';
  process.env.REACT_APP_WIDGET_TYPE = 'Widget';
  useSnStore.setState({ context: null, page: null, widgets: null, layout: 'vanilla' });
  mockRepository.load.mockReset().mockImplementation(({ idOrPath }) => Promise.resolve({ d: context(idOrPath.endsWith('/b') ? 'b' : 'a') }));
  mockRepository.loadCollection.mockReset().mockImplementation(({ oDataOptions }) => Promise.resolve(
    pageResult(oDataOptions.query.includes(`${site}/b/(layout)`) ? 'b' : 'a'),
  ));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  staticLink = document.createElement('link');
  staticLink.rel = 'stylesheet';
  staticLink.href = '/legacy.css';
  document.head.appendChild(staticLink);
});
afterEach(async () => {
  await act(async () => root.unmount());
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = previousEnvironment;
  container.remove();
  staticLink.remove();
});

it('uses the resolved Page CSS with unchanged templates and widgets across A -> B -> A', async () => {
  mockRepository.loadCollection.mockImplementation(({ oDataOptions }) => Promise.resolve(
    oDataOptions.query.includes(`${site}/b/(layout)`) ? pageResult('b', { results: [stylesheet('b'), stylesheet('shared')] }) :
      pageResult('a', { results: [stylesheet('shared'), stylesheet('a')] }),
  ));
  await start();
  expect(urls()).toEqual([`${repository}/Root/Skins/shared.css`, `${repository}/Root/Skins/a.css`]);
  expect(container.querySelector('.layout-middle').textContent).toContain('a story');
  expect(mockRepository.loadCollection.mock.calls[0][0].oDataOptions.expand).toEqual(['CustomRoot', 'Stylesheets']);
  expect(mockRepository.loadCollection.mock.calls[0][0].oDataOptions.orderby).toEqual(['Index']);
  await go('/b');
  expect(urls()).toEqual([`${repository}/Root/Skins/b.css`, `${repository}/Root/Skins/shared.css`]);
  expect(container.querySelector('.layout-middle').textContent).toContain('b story');
  await go('/a');
  expect(urls()).toEqual([`${repository}/Root/Skins/shared.css`, `${repository}/Root/Skins/a.css`]);
  expect(useSnStore.getState().page.Id).toBe(101);
  expect(document.head.contains(staticLink)).toBe(true);
});

it('removes previous CSS immediately while the next context is pending', async () => {
  await start();
  const pending = deferred();
  mockRepository.load.mockReturnValueOnce(pending.promise);
  await act(async () => navigate('/b'));
  expect(urls()).toEqual([]);
  expect(container.textContent).toBe('');
  expect(useSnStore.getState().page).toBeNull();
  await act(async () => pending.resolve({ d: context('b') }));
  await flushHead();
  expect(urls()).toEqual([`${repository}/Root/Skins/b.css`]);
});

it.each([
  ['leisure-simple', 'Site - a', 'Site - b'],
  ['leisure-error', 'Not found', 'Not found'],
])('commits %s Page CSS and head metadata without waiting for animation frames', async (template, titleA, titleB) => {
  mockRepository.loadCollection.mockImplementation(({ oDataOptions }) => {
    const name = oDataOptions.query.includes(`${site}/b/(layout)`) ? 'b' : 'a';
    const result = pageResult(name);
    result.d.results[1].PageTemplate = template;
    return Promise.resolve(result);
  });
  await act(async () => root.render(
    <HelmetProvider><MemoryRouter initialEntries={['/a']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navigation /><PageWrapper />
    </MemoryRouter></HelmetProvider>,
  ));
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
  expect(document.title).toBe(titleA);
  await act(async () => navigate('/b'));
  expect(urls()).toEqual([`${repository}/Root/Skins/b.css`]);
  expect(document.title).toBe(titleB);
});

it.each(['missing', 'failed'])('keeps prior CSS removed for a %s context', async mode => {
  await start();
  if (mode === 'missing') mockRepository.load.mockResolvedValueOnce({ d: {} });
  else mockRepository.load.mockRejectedValueOnce(new Error('offline'));
  await go('/b');
  expect(urls()).toEqual([]);
  expect(useSnStore.getState().context).toBeNull();
  expect(useSnStore.getState().page).toBeNull();
  expect(container.textContent).toBe('Maintenance');
});

it.each(['missing', 'failed'])('uses the automatic layout without prior CSS for a %s Page', async mode => {
  await start();
  if (mode === 'missing') mockRepository.loadCollection.mockResolvedValueOnce({ d: { results: [] } });
  else mockRepository.loadCollection.mockRejectedValueOnce(new Error('offline'));
  await go('/b');
  expect(urls()).toEqual([]);
  expect(useSnStore.getState().page).toBeNull();
  expect(container.textContent).toBe('Automatic layout');
  expect(mockRepository.loadCollection).toHaveBeenCalledTimes(2);
});

it('retries only the legacy expand when Layout has no Stylesheets field', async () => {
  const result = pageResult('a');
  delete result.d.results[1].Stylesheets;
  mockRepository.loadCollection.mockRejectedValueOnce(Object.assign(new Error('Bad Request'), {
    statusCode: 400, body: { error: { message: { value: "Unknown field: 'Stylesheets'" } } },
  })).mockResolvedValueOnce(result);
  await start();
  expect(mockRepository.loadCollection).toHaveBeenCalledTimes(2);
  const [initial, retry] = mockRepository.loadCollection.mock.calls.map(([options]) => options);
  expect(initial.oDataOptions.expand).toEqual(['CustomRoot', 'Stylesheets']);
  expect(retry).toEqual({ ...initial, oDataOptions: { ...initial.oDataOptions, expand: ['CustomRoot'] } });
  expect(urls()).toEqual([]);
  expect(container.textContent).toContain('a story');
});

it.each([
  Object.assign(new Error('Unknown field: Stylesheets'), { statusCode: 403 }),
  Object.assign(new Error('Unknown field: OtherField'), { statusCode: 400 }),
  Object.assign(new Error('Stylesheets File was not found'), { statusCode: 400 }),
])('does not mask other errors with a legacy retry: %s', async error => {
  mockRepository.loadCollection.mockRejectedValueOnce(error);
  await start();
  expect(mockRepository.loadCollection).toHaveBeenCalledTimes(1);
  expect(urls()).toEqual([]);
  expect(container.textContent).toBe('Automatic layout');
});

it('does not retry an old missing-field response after navigation', async () => {
  const old = deferred();
  mockRepository.loadCollection.mockReturnValueOnce(old.promise);
  await start();
  await go('/b');
  await act(async () => old.reject(Object.assign(new Error('Unknown field: Stylesheets'), { statusCode: 400 })));
  await flushHead();
  expect(mockRepository.loadCollection).toHaveBeenCalledTimes(2);
  expect(urls()).toEqual([`${repository}/Root/Skins/b.css`]);
});

it('keeps the existing layout and widgets for empty or bad stylesheet references', async () => {
  mockRepository.loadCollection.mockResolvedValueOnce(pageResult('a', { results: [] }))
    .mockResolvedValueOnce(pageResult('b', { results: [{ Type: 'File', Path: 'https://other.example/Root/b.css' }] }));
  await start();
  expect(urls()).toEqual([]);
  expect(container.textContent).toContain('a story');
  await go('/b');
  expect(urls()).toEqual([]);
  expect(container.textContent).toContain('b story');
  expect(document.head.contains(staticLink)).toBe(true);
});

it.each([undefined, 'unknown-template'])('preserves automatic fallback for PageTemplate %s', async template => {
  const result = pageResult('a');
  result.d.results[1].PageTemplate = template;
  mockRepository.loadCollection.mockResolvedValueOnce(result);
  await start();
  expect(container.textContent).toBe('Automatic layout');
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
});

it('preserves direct Layout context selection and expands its File references', async () => {
  const selected = { ...context('a'), Type: 'Layout', Path: `${site}/(layout)/This` };
  mockRepository.load.mockResolvedValueOnce({ d: selected });
  await start();
  const { query, expand } = mockRepository.loadCollection.mock.calls[0][0].oDataOptions;
  expect(query).toBe(`Path:'${selected.Path}' OR TypeIs:Widget AND InFolder:'${selected.Path}' AND Hidden:0`);
  expect(expand).toEqual(['CustomRoot', 'Stylesheets']);
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
});

it('ignores a stale context response after revisiting the same URL', async () => {
  const old = deferred();
  mockRepository.load.mockReturnValueOnce(old.promise);
  await start();
  await go('/b');
  await go('/a');
  const count = mockRepository.loadCollection.mock.calls.length;
  await act(async () => old.resolve({ d: context('b') }));
  await flushHead();
  expect(mockRepository.loadCollection).toHaveBeenCalledTimes(count);
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
  expect(useSnStore.getState().context.Id).toBe(1);
});

it('ignores a stale Page response after A -> B -> A', async () => {
  const old = deferred();
  mockRepository.loadCollection.mockReturnValueOnce(old.promise);
  await start();
  await go('/b');
  await go('/a');
  await act(async () => old.resolve(pageResult('b')));
  await flushHead();
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
  expect(useSnStore.getState().page.Id).toBe(101);
  expect(container.textContent).toContain('a story');
});

it('removes owned links on unmount and ignores an outstanding Page result', async () => {
  await start();
  const pending = deferred();
  mockRepository.loadCollection.mockReturnValueOnce(pending.promise);
  await go('/b');
  await act(async () => root.unmount());
  expect(urls()).toEqual([]);
  await act(async () => pending.resolve(pageResult('b')));
  expect(useSnStore.getState().page).toBeNull();
  expect(document.head.contains(staticLink)).toBe(true);
});

it('removes a resolved Page stylesheet when PageWrapper unmounts', async () => {
  await start();
  expect(urls()).toEqual([`${repository}/Root/Skins/a.css`]);
  await act(async () => root.unmount());
  expect(urls()).toEqual([]);
  expect(document.head.contains(staticLink)).toBe(true);
});

it('delivers updated widget props while preserving its repository ID', async () => {
  const widget = { Id: 10, Type: 'WidgetSimpleText', PortletZone: 'content', Title: 'Original' };
  const render = async widgets => act(async () => root.render(
    <CachedComponentsByZone type="widgets" zone="content" widgets={widgets} context={context('a')} />,
  ));
  await render([widget]);
  expect(container.textContent).toBe('Original');
  await render([{ ...widget, Title: 'Updated' }]);
  expect(container.textContent).toBe('Updated');
});
