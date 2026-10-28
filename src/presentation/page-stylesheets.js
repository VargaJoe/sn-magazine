import React from 'react';
import { Helmet } from 'react-helmet-async';

// Expanded File references use the repository's normal raw-content route.
// Fonts and images in CSS resolve relative to that CSS file on the server.
export function repositoryFileUrl(path, repositoryUrl) {
  if (typeof path !== 'string' || !path.startsWith('/Root/')) {
    throw new Error('A repository File path under /Root/ is required');
  }
  const repository = new URL(repositoryUrl);
  const asset = new URL(path, repository);
  if (!['https:', 'http:'].includes(asset.protocol) ||
      asset.origin !== repository.origin || asset.username || asset.password ||
      asset.search || asset.hash || /%(2f|5c)/i.test(asset.pathname) ||
      !decodeURIComponent(asset.pathname).startsWith('/Root/')) {
    throw new Error('Stylesheets must be repository Files under /Root/');
  }
  return asset.href;
}

export function pageStylesheetUrls(page, repositoryUrl) {
  const references = Array.isArray(page?.Stylesheets) ? page.Stylesheets : page?.Stylesheets?.results;
  if (!Array.isArray(references)) return [];
  const urls = new Set();
  for (const file of references) {
    if (file?.Type !== 'File') continue;
    try {
      urls.add(repositoryFileUrl(file.Path, repositoryUrl));
    } catch {
      // Missing, inaccessible or malformed references leave the static CSS intact.
    }
  }
  return [...urls];
}

export default function PageStylesheets({ page, repositoryUrl }) {
  const links = pageStylesheetUrls(page, repositoryUrl).map(href => ({
    rel: 'stylesheet',
    href,
    'data-sn-page-stylesheet': 'true',
    'data-sn-page': String(page.Id),
  }));
  // This Helmet instance owns only Page CSS, including its empty/loading state.
  // Immediate updates remove the previous Page's CSS when navigation commits.
  return <Helmet defer={false} link={links} />;
}
