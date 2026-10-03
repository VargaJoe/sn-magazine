import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import SitePresentationProvider from './site-presentation-provider';
import { addPageTemplate } from '../components/utils/page-template';
import { CachedComponentsByZone } from '../components/utils/add-component';
import { useSnStore } from '../components/store/sn-store';

jest.mock('../components/widgets/auto-widgetsimpletext', () => ({
  __esModule: true,
  default: ({ widget }) => <p>{widget.Title}</p>,
}));

let container, root, originalFetch;
beforeEach(() => {
  originalFetch = global.fetch;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  useSnStore.setState({ context: { Id: 1, Type: 'Workspace' }, widgets: [
    { Id: 10, Type: 'WidgetSimpleText', PortletZone: 'side', Title: 'Menu' },
    { Id: 20, Type: 'WidgetSimpleText', PortletZone: 'content', Title: 'Story' },
    { Id: 30, Type: 'WidgetSimpleText', PortletZone: 'footer', Title: 'Footer' },
  ] });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

const config = zones => ({ version: 1, stylesheets: ['skin.css'], layouts: {
  main: { className: 'custom-layout', zones: zones.map(name => ({ name })) },
} });
const render = async (sitePath = '/Root/Content/alpha', template = 'repository:main') => {
  await act(async () => {
    root.render(<HelmetProvider><SitePresentationProvider repositoryUrl="https://repo.example" sitePath={sitePath}>
      {addPageTemplate(template)}
    </SitePresentationProvider></HelmetProvider>);
  });
};

it('renders repository zone order and preserves widget content; legacy templates remain explicit', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => config(['footer', 'content', 'side']) });
  await render();
  expect([...container.querySelectorAll('[data-sn-zone]')].map(node => node.dataset.snZone)).toEqual(['footer', 'content', 'side']);
  expect(container.textContent).toBe('FooterStoryMenu');
  await render('/Root/Content/alpha', 'leisure-simple');
  expect(container.querySelector('[data-sn-layout]')).toBeNull();
  expect(container.querySelector('.layout-left').textContent).toBe('Menu');
  expect(container.querySelector('.layout-middle').textContent).toContain('Story');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('updates widget props without changing its repository ID', async () => {
  await act(async () => root.render(<CachedComponentsByZone type="widgets" zone="content" widgets={useSnStore.getState().widgets} context={useSnStore.getState().context} />));
  expect(container.textContent).toBe('Story');
  const widgets = useSnStore.getState().widgets.map(widget => ({ ...widget, Title: 'Updated' }));
  await act(async () => root.render(<CachedComponentsByZone type="widgets" zone="content" widgets={widgets} context={useSnStore.getState().context} />));
  expect(container.textContent).toBe('Updated');
});

it.each(['missing', 'invalid', 'network', 'unknown-template'])('falls back to the existing layout for %s', async scenario => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = jest.fn(async () => {
    if (scenario === 'network') throw new Error('offline');
    if (scenario === 'missing') return { status: 404 };
    return { ok: true, json: async () => scenario === 'invalid' ? { version: 99 } : config(['content']) };
  });
  await render('/Root/Content/alpha', scenario === 'unknown-template' ? 'repository:absent' : 'repository:main');
  expect(container.querySelector('[data-sn-layout]')).toBeNull();
  expect(container.querySelector('.layout-left').textContent).toBe('Menu');
  expect(container.querySelector('.layout-middle').textContent).toContain('Story');
});

it('cancels old site loads so a delayed response cannot replace the current site', async () => {
  let resolveOld;
  const oldResponse = new Promise(resolve => { resolveOld = resolve; });
  global.fetch = jest.fn()
    .mockReturnValueOnce(oldResponse)
    .mockResolvedValueOnce({ ok: true, json: async () => config(['content', 'side']) });
  await render('/Root/Content/alpha');
  const oldSignal = global.fetch.mock.calls[0][1].signal;
  await render('/Root/Content/beta');
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld({ ok: true, json: async () => config(['footer', 'content']) }));
  expect([...container.querySelectorAll('[data-sn-zone]')].map(node => node.dataset.snZone)).toEqual(['content', 'side']);
});
