import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { MagazineNavigation } from './sections';
import { useMagazine } from './provider';
import { initialReaderHeader } from './initial-header';

jest.mock('./provider', () => ({ ...jest.requireActual('./provider'), useMagazine: jest.fn() }));
jest.mock('../editorial/repository', () => ({
  ...jest.requireActual('../editorial/repository'), useEditorialContent: () => ({ items: [], loading: false }),
}));

it('retains the original HTML logo while source loads, resolves and navigation remounts', async () => {
  const previousAct = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const header = document.createElement('div');
  header.dataset.snInitialHeader = '';
  header.dataset.siteRoot = '/Root/Content/Journal';
  header.innerHTML = '<a href="/"><picture><img src="/reader-initial/desktop.png" width="205" height="44"></picture></a><div data-sn-initial-navigation></div>';
  document.body.appendChild(header);
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container), image = header.querySelector('img');
  // React's root.render needs act; this is not a Testing Library render helper.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  const showNavigation = key => act(async () => root.render(<MemoryRouter><MagazineNavigation key={key} widget={{}} /></MemoryRouter>));
  try {
    expect(initialReaderHeader('/Root/Content/Other')).toBeNull();
    for (const [key, source] of [['loading', {}], ['ready', { BrandingFolder: { Path: '/Root/Content/Journal/brand' } }], ['route', {}]]) {
      useMagazine.mockReturnValue({ root: header.dataset.siteRoot, context: {}, source, routeFor: () => '' });
      await showNavigation(key);
      expect(header.querySelector('img')).toBe(image);
      expect(image.getAttribute('src')).toBe('/reader-initial/desktop.png');
      expect(header.querySelector('#reader-navigation')).not.toBeNull();
      expect(document.querySelector('.rm-logo')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
    }
    await act(async () => header.querySelector('button').click());
    expect(header.querySelector('button').getAttribute('aria-expanded')).toBe('true');
  } finally {
    await act(async () => root.unmount());
    expect(header.querySelector('img')).toBe(image);
    header.remove(); container.remove(); global.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});
