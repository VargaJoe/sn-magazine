import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { useMagazine } from './provider';
import { brandingAssets, MagazineBrand, MagazineIcons } from './branding';

jest.mock('./provider', () => ({ ...jest.requireActual('./provider'), useMagazine: jest.fn() }));

const site = '/Root/Content/Journal';
const folder = { Type: 'Folder', Path: site + '/(structure)/Painted brand' };
const previousOrigin = process.env.REACT_APP_API_URL;
beforeEach(() => { process.env.REACT_APP_API_URL = 'https://repository.example'; });
afterAll(() => {
  if (previousOrigin === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = previousOrigin;
});

it('does not borrow another site artwork or use hidden, deferred, or unsafe references', () => {
  for (const reference of [undefined, { __deferred: {} }, { ...folder, Hidden: true },
    { ...folder, Path: site + '-other/Brand' }, { ...folder, Path: site + '/%2e%2e/Brand' },
    { ...folder, Path: 'https://outside.example/Brand' }]) {
    expect(brandingAssets({ BrandingFolder: reference }, site)).toBeNull();
  }
});

it('renders responsive repository artwork and removes owned icons when changing to an unbranded site', async () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const previousAct = global.IS_REACT_ACT_ENVIRONMENT; global.IS_REACT_ACT_ENVIRONMENT = true;
  const unrelated = document.createElement('link'); unrelated.rel = 'stylesheet'; unrelated.href = '/legacy.css'; document.head.appendChild(unrelated);
  useMagazine.mockReturnValue({ source: { BrandingFolder: { results: [folder] } }, root: site });
  const render = () => act(async () => root.render(<HelmetProvider><MagazineBrand name="Journal" /><MagazineIcons /></HelmetProvider>));
  try {
    await render();
    const img = container.querySelector('picture img');
    expect(img.alt).toBe('Journal');
    expect(img.src).toBe('https://repository.example/Root/Content/Journal/(structure)/Painted%20brand/header-desktop.png');
    expect(img.srcset).toContain('header-desktop-2x.png 2x');
    expect(container.querySelector('source').media).toBe('(max-width: 600px)');
    expect(document.head.querySelectorAll('[data-sn-magazine-icon]')).toHaveLength(4);
    useMagazine.mockReturnValue({ source: {}, root: '/Root/Content/Another' });
    await render();
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('.rm-logo')).not.toBeNull();
    expect(container.textContent).toBe('Journal');
    expect(document.head.querySelector('[data-sn-magazine-icon]')).toBeNull();
    expect(document.head.contains(unrelated)).toBe(true);
    await act(async () => root.unmount());
  } finally { container.remove(); unrelated.remove(); global.IS_REACT_ACT_ENVIRONMENT = previousAct; }
});
