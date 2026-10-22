import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { generateSitemap } from './lib/sitemap.mjs';
import { readPublicSitemap } from './lib/repository-sitemap.mjs';
import { readSiteSettings } from './lib/site-settings.mjs';
import { loadEnvironment } from './lib/load-environment.mjs';

// Read-only verification: default checks the generated preview against anonymous data;
// --repository checks the stored public XML; --origin checks the Netlify proxy/robots.
const option = name => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const origin = option('--origin');
loadEnvironment();
const settings = readSiteSettings(process.env, { requireSitemap: true });
let response;
let xml;
if (origin) {
  response = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `Sitemap returned HTTP ${response.status}`);
  assert.match(response.headers.get('content-type'), /^(application|text)\/xml/);
  xml = await response.text();
} else if (process.argv.includes('--repository')) {
  xml = await readPublicSitemap(settings);
} else {
  xml = await generateSitemap(process.env);
}
const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x =>
  x[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
assert.ok(locations.length > 0, 'Expected public page URLs');
const canonicalOrigin = settings.origin;
assert.ok(locations.every(url => new URL(url).origin === canonicalOrigin), 'Unexpected site origin');
assert.equal(new Set(locations).size, locations.length, 'Duplicate URLs');
assert.ok(locations.every(url => !decodeURIComponent(new URL(url).pathname).split('/').some(x => x.startsWith('('))),
  'Technical content URL');
if (origin) {
  const robotsResponse = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(30000) });
  assert.equal(robotsResponse.status, 200);
  assert.ok((await robotsResponse.text()).includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
}
const output = option('--output');
if (output) await writeFile(output, xml, 'utf8');
console.log(JSON.stringify({
  status: response?.status || 200,
  urls: locations.length,
  lastmod: [...xml.matchAll(/<lastmod>/g)].length,
  bytes: Buffer.byteLength(xml),
  canonicalOriginMatches: true,
  robotsMatches: origin ? true : undefined,
  cacheStatus: response?.headers.get('cache-status'),
}, null, 2));
