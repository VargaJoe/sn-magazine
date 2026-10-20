import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import sitemap from '../netlify/functions/sitemap.mjs';
import robots from '../netlify/functions/robots.mjs';

// Use node --env-file=<private site env> to test real anonymous repository data.
// --origin also exercises a running Netlify Dev server or a deployed preview.
const option = name => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const origin = option('--origin');
const request = new Request(`${origin || 'https://request-host.example'}/sitemap.xml`);
const response = origin ? await fetch(request) : await sitemap(request);
assert.equal(response.status, 200, `Sitemap returned HTTP ${response.status}`);
assert.match(response.headers.get('content-type'), /^application\/xml/);
const xml = await response.text();
const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x =>
  x[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
assert.ok(locations.length > 0, 'Expected public page URLs');
const canonicalOrigin = new URL(process.env.REACT_APP_SITE_HOST).origin;
assert.ok(locations.every(url => new URL(url).origin === canonicalOrigin), 'Unexpected site origin');
assert.equal(new Set(locations).size, locations.length, 'Duplicate URLs');
assert.ok(locations.every(url => !decodeURIComponent(new URL(url).pathname).split('/').some(x => x.startsWith('('))),
  'Technical content URL');
const robotsRequest = new Request(`${origin || 'https://request-host.example'}/robots.txt`);
const robotsResponse = origin ? await fetch(robotsRequest) : robots(robotsRequest);
assert.equal(robotsResponse.status, 200);
assert.ok((await robotsResponse.text()).includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
if (!origin) {
  assert.match(response.headers.get('netlify-cdn-cache-control'), /max-age=86400/);
}
const output = option('--output');
if (output) await writeFile(output, xml, 'utf8');
console.log(JSON.stringify({
  status: response.status,
  urls: locations.length,
  lastmod: [...xml.matchAll(/<lastmod>/g)].length,
  bytes: Buffer.byteLength(xml),
  canonicalOriginMatches: true,
  robotsMatches: true,
  cacheStatus: response.headers.get('cache-status'),
  cdnCacheControl: response.headers.get('netlify-cdn-cache-control'),
}, null, 2));
