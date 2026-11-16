import React from 'react';
import { Helmet } from 'react-helmet-async';
import { isHidden, plainText, repositoryImage, repositoryPath } from '../editorial/repository';
import { oneReference, useMagazine } from './provider';

// The optional native Folder belongs to this site; artwork stays in the repository.
export function brandingAssets(source, root = process.env.REACT_APP_DATA_PATH) {
  const folder = oneReference(source?.BrandingFolder);
  const base = repositoryPath(root);
  const folderPath = repositoryPath(folder?.Path);
  if (!base || !folderPath || isHidden(folder) || !folderPath.startsWith(base + '/')) return null;
  const asset = name => repositoryImage(folderPath.split('/').map(encodeURIComponent).join('/') + '/' + name);
  return {
    desktop: asset('header-desktop.png'), desktop2x: asset('header-desktop-2x.png'),
    mobile: asset('header-mobile.png'), mobile2x: asset('header-mobile-2x.png'),
    favicon: asset('favicon.ico'), icon32: asset('favicon-32.png'), icon192: asset('favicon-192.png'),
    appleTouch: asset('apple-touch-icon.png'),
  };
}

export function MagazineBrand({ name }) {
  const { source, root } = useMagazine();
  const assets = brandingAssets(source, root);
  return assets?.desktop ? <picture className="rm-brand-picture">
    <source media="(max-width: 600px)" srcSet={`${assets.mobile} 1x, ${assets.mobile2x} 2x`} width="163" height="32" />
    <img className="rm-brand-image" src={assets.desktop} srcSet={`${assets.desktop} 1x, ${assets.desktop2x} 2x`} width="205" height="44" alt={plainText(name)} />
  </picture> : <>
    <svg className="rm-logo" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 9c5-2 10-1 15 2 5-3 10-4 15-2v24c-5-2-10-1-15 2-5-3-10-4-15-2V9Z M20 11v24 M11 16l5 1 M25 17l5-1" stroke="currentColor" strokeWidth="1.5" /></svg>
    <span>{plainText(name)}</span>
  </>;
}

export function MagazineIcons() {
  const { source, root } = useMagazine();
  const assets = brandingAssets(source, root);
  return assets?.favicon ? <Helmet defer={false}>
    <link rel="icon" href={assets.favicon} sizes="16x16 32x32 48x48" type="image/x-icon" data-sn-magazine-icon="true" />
    <link rel="icon" href={assets.icon32} sizes="32x32" type="image/png" data-sn-magazine-icon="true" />
    <link rel="icon" href={assets.icon192} sizes="192x192" type="image/png" data-sn-magazine-icon="true" />
    <link rel="apple-touch-icon" href={assets.appleTouch} sizes="180x180" data-sn-magazine-icon="true" />
  </Helmet> : null;
}
