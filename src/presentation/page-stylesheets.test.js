import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import PageStylesheets, { pageStylesheetUrls, repositoryFileUrl } from './page-stylesheets';

const repository = 'https://repo.example';
const file = Path => ({ Type: 'File', Path });

it('uses native raw File URLs and preserves expanded reference order', () => {
  const page = { Stylesheets: { results: [
    file('/Root/Skins/second.css'), file('/Root/Skins/first.css'), file('/Root/Skins/second.css'),
  ] } };
  expect(pageStylesheetUrls(page, repository)).toEqual([
    `${repository}/Root/Skins/second.css`, `${repository}/Root/Skins/first.css`,
  ]);
  expect(repositoryFileUrl('/Root/Skins/shared theme/skin.css', repository))
    .toBe(`${repository}/Root/Skins/shared%20theme/skin.css`);
  expect(pageStylesheetUrls({ Stylesheets: [file('/Root/Skins/first.css')] }, repository))
    .toEqual([`${repository}/Root/Skins/first.css`]);
});

it.each([
  '/outside.css', 'skin.css', 'https://other.example/Root/skin.css', '//other.example/Root/skin.css',
  'javascript:alert(1)', 'data:text/css,test', '/Root/../outside.css',
  '/Root/..%2foutside.css', '/Root/..%5Coutside.css', '/Root/%ZZ.css',
  '/Root/skin.css?action=Edit', '/Root/skin.css#fragment',
])('rejects unsafe File paths: %s', path => {
  expect(() => repositoryFileUrl(path, repository)).toThrow();
});

it.each([undefined, null, {}, { Stylesheets: null }, { Stylesheets: { __deferred: {} } },
  { Stylesheets: { results: [null, 12, { Type: 'Folder', Path: '/Root/a.css' }, file(undefined), file('/outside.css')] } },
])('leaves legacy CSS alone for absent or invalid expanded references: %j', page => {
  expect(pageStylesheetUrls(page, repository)).toEqual([]);
});

it('owns only Page stylesheet links and cleans up on empty state and unmount', async () => {
  const container = document.createElement('div');
  const staticLink = document.createElement('link');
  staticLink.rel = 'stylesheet';
  staticLink.href = '/legacy.css';
  document.head.appendChild(staticLink);
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = async page => act(async () => root.render(
    <HelmetProvider><PageStylesheets page={page} repositoryUrl={repository} /></HelmetProvider>,
  ));
  try {
    await render({ Id: 10, Stylesheets: { results: [file('/Root/b.css'), file('/Root/a.css')] } });
    expect([...document.head.querySelectorAll('[data-sn-page-stylesheet]')].map(link => link.href))
      .toEqual([`${repository}/Root/b.css`, `${repository}/Root/a.css`]);
    expect(document.head.contains(staticLink)).toBe(true);
    await render(null);
    expect(document.head.querySelector('[data-sn-page-stylesheet]')).toBeNull();
    await render({ Id: 20, Stylesheets: [file('/Root/c.css')] });
    expect(document.head.querySelector('[data-sn-page-stylesheet]').dataset.snPage).toBe('20');
    await act(async () => root.unmount());
    expect(document.head.querySelector('[data-sn-page-stylesheet]')).toBeNull();
    expect(document.head.contains(staticLink)).toBe(true);
  } finally {
    container.remove();
    staticLink.remove();
  }
});
