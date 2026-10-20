# Dynamic sitemap on Netlify

Each Netlify project builds the same engine with its own existing site settings.
The sitemap is generated from the anonymous SenseNet API at request time, not
from HTML files or a separate inventory of URLs. Content publication does not
require a frontend build.

## Site configuration

Set these existing variables in each Netlify project's environment. Their scope
must include **Functions** as well as **Builds** (the default all-scopes setting
also works). Redeploy once after changing the scope or installing this feature.
Variables declared only in a `netlify.toml` build environment are not available
to functions.

| Variable | Meaning |
| --- | --- |
| `REACT_APP_API_URL` | SenseNet repository base URL |
| `REACT_APP_DATA_PATH` | This site's repository content root |
| `REACT_APP_SITE_HOST` | This site's canonical origin, such as `https://site.example` |
| `REACT_APP_WIDGET_TYPE` | Existing widget base type; defaults to `Widget` |

The function never selects a repository or canonical domain from request headers,
cookies, query parameters, or a hostname table. Distinct Netlify projects provide
their own environment and CDN cache. No site values are committed or generated
into repository configuration files. Both URL settings require HTTPS, except for
HTTP loopback addresses used during local tests.

`netlify.toml` sets only the functions directory and bundler. Existing per-project
build command, publish directory, repository and branch settings remain in the
Netlify dashboard.

## Routes and content selection

- `/sitemap.xml` invokes `netlify/functions/sitemap.mjs`.
- `/robots.txt` invokes a small companion function, retaining `User-agent: *` and
  the empty `Disallow` rule and adding the configured canonical sitemap URL.
- Specific forced rewrites in `public/_redirects` precede the existing React SPA
  fallback. The static `public/robots.txt` remains a fallback for other hosts.

The SenseNet query is restricted to `REACT_APP_DATA_PATH`. No authentication or
incoming visitor headers are forwarded. Automatic system filters and lifespan
filters stay enabled, `Hidden` must be false, and File, SystemFolder and Widget
type families are excluded. File inheritance excludes images and other assets.
Public Layout content at a normal route remains eligible: a Layout can itself
be a page in this engine.

As a second boundary check, paths outside the exact configured root are rejected,
including sibling roots with a similar name. Parenthesized path segments (the
engine's `(layout)`, `(structure)` and other configuration branches), unsafe
segments and technical base types are omitted. The remaining public content
paths map to the same routes as the frontend. This uses the engine's existing
route convention, not a new per-type sitemap configuration. Keep non-page data
in the technical branches or mark it Hidden; a public content node at an ordinary
route is otherwise treated as a page.

The root maps to `/`; child segments are URL encoded. All output URLs use
`REACT_APP_SITE_HOST`, matching the frontend's canonical origin, regardless of
which alias or preview hostname requested the sitemap. URLs are deduplicated,
sorted and XML escaped.

Queries use stable Id ordering and CQL paging, continuing to an empty page even
if the repository caps the requested page size. A failed page, malformed response,
repeating pagination or empty eligible result fails the entire request with
HTTP 503, `Retry-After: 300` and `no-store`; a partial sitemap is never cached.
The repository fetches share a 25-second timeout. The current single-file response
supports up to 50,000 queried records and 5 MiB of XML, leaving headroom within
the function payload limit. Larger sites need partitioned sitemaps; exceeding
these limits fails instead of silently truncating the inventory.

`lastmod` comes only from a non-folder content node's valid `ModificationDate`
(ISO or legacy .NET date). Folder timestamps are omitted because changes to
their child listings are not necessarily reflected in the folder's own date.
Generation time is never used as a content modification date. Aggregated pages
whose displayed content changes independently need a separate, accurate page
timestamp before their `lastmod` can be provided.

## Cache behavior

Successful sitemap and robots responses set:

```text
Cache-Control: public, max-age=0, must-revalidate
Netlify-CDN-Cache-Control: public, durable, max-age=86400, must-revalidate
```

Netlify's shared durable cache and edge cache retain the response for 24 hours.
After expiry a request generates the full current list, following additions,
renames and removals. There is no scheduled job or background refresh. There is
no stale-while-revalidate extension beyond 24 hours. Browsers revalidate rather
than starting another independent 24-hour cache interval. Normal Netlify deploy
cache invalidation remains enabled. Durable caching reduces duplicate invocations;
it does not guarantee exactly one invocation globally per day.

## Verification

Run the focused function/transport tests and existing frontend regressions:

```powershell
npm run test:sitemap
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
$env:CI = 'false'
npm run build
```

Use a private environment file containing the existing site variables to exercise
the actual exported functions against real anonymous repository data. Node 20.6+
supports `--env-file`; it does not copy the environment file into the output:

```powershell
node --env-file=.env.site-a scripts/verify-sitemap.mjs
node --env-file=.env.site-b scripts/verify-sitemap.mjs
```

To exercise Netlify's routing locally, install/use Netlify CLI and start its
static server after building (use the same site environment):

```powershell
netlify dev --offline --dir build --functions netlify/functions --framework '#static'
node --env-file=.env.site-a scripts/verify-sitemap.mjs --origin http://localhost:8888
```

For each site's deployed preview or production deployment:

1. Open `/sitemap.xml`: HTTP 200, `application/xml`, this site's canonical URLs
   and `/` present. No repository paths, technical branches or another site's URLs.
2. Open `/robots.txt`: plain text with that site's canonical sitemap address.
3. Request `/sitemap.xml` twice and inspect `Cache-Status` for a Netlify cache hit.
   Netlify consumes `Netlify-CDN-Cache-Control`; it need not appear downstream.
4. Open an ordinary article route: React SPA routing still works.
5. Check both projects separately. A new public article should enter the sitemap
   after cache expiry; existing article dates should stay unchanged.

The verifier accepts `--origin https://preview.example` to check a running host
and `--output temp/sitemap.xml` to save XML for inspection. It prints only counts
and verification results, not private site configuration. `netlify dev` does not
emulate CDN caching: a live `Cache-Status` check is needed to confirm CDN behavior.

References: [Netlify Functions](https://docs.netlify.com/build/functions/overview/),
[Netlify caching](https://docs.netlify.com/build/caching/caching-overview/),
[SenseNet search](https://docs.sensenet.com/api-docs/basic-concepts/05-search-filter/),
[Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
