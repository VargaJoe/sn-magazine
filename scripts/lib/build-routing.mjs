import { readSiteSettings } from './site-settings.mjs';

export function buildRouting(env, redirects, robots) {
  const path = env.REACT_APP_SITEMAP_PATH?.trim();
  // Existing sites opt in by setting the new path; their ordinary build still works.
  if (!path) return { redirects, robots };
  const settings = readSiteSettings(env, { requireSitemap: true });
  if (redirects.split(/\r?\n/).some(line => /^\s*\/sitemap\.xml\s/.test(line))) {
    throw new Error('The source redirects already contain a sitemap rule');
  }
  return {
    redirects: `/sitemap.xml  ${settings.sitemapUrl}  200!\n${redirects}`,
    robots: `${robots.trimEnd()}\n\nSitemap: ${settings.origin}/sitemap.xml\n`,
  };
}
