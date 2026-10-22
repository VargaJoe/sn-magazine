# Repository sitemap with a Netlify proxy

The sitemap is an ordinary public SenseNet File, updated by a manually run local
generator. Netlify serves it at `/sitemap.xml` through an external 200 rewrite.
There are no deployed Functions, scheduled jobs or request-time generators.
Each Netlify project builds the same code with its own environment settings.

## Site configuration

The file path follows the same convention as the logo: it is relative to the
configured site content root, with a leading slash.

```dotenv
REACT_APP_API_URL=https://repository.example
REACT_APP_DATA_PATH=/Root/Content/Magazine
REACT_APP_SITE_HOST=https://site.example
REACT_APP_LOGO_PATH=/(structure)/Site/logo.png
REACT_APP_SITEMAP_PATH=/(structure)/Site/sitemap.xml
```

This example resolves to the public file
`https://repository.example/Root/Content/Magazine/%28structure%29/Site/sitemap.xml`.
XML entries use `https://site.example`, never the repository origin.

Netlify needs these site variables in the **Builds** scope only. No Functions
scope, domain registry, extra JSON configuration or billing change is required.
The new `REACT_APP_SITEMAP_PATH` opts a site in; when it is missing/blank, builds
retain the existing SPA routing and robots rules without advertising a sitemap.
Invalid configured paths fail the build rather than publishing a misleading route.
Use raw path segments; the tools encode parentheses, Unicode and spaces. Absolute
URLs, traversal, backslashes, query strings, fragments and percent-encoded paths
are rejected. HTTPS is required except for loopback test addresses.

`npm run build` (or `yarn build`) runs the postbuild script, which writes
`build/_redirects` and `build/robots.txt` from their public source templates.
It uses CRA's production dotenv loading and shell/environment precedence, and
honors `BUILD_PATH`. Build/publish dashboard settings are otherwise unchanged.
If a custom build command directly invokes `react-scripts build`, append
`node scripts/prepare-netlify.mjs` or use `npm run build` to run the postbuild step.

The generated sitemap rule precedes the SPA fallback:

```text
/sitemap.xml  https://repository.example/Root/Content/Magazine/%28structure%29/Site/sitemap.xml  200!
/*  /index.html  200
```

The generated static robots file retains existing rules and adds
`Sitemap: https://site.example/sitemap.xml`. Generated per-site files stay in the
ignored build directory. Source templates and the Git repository remain generic.
Deploy once to install/change the proxy path; updating the XML at the same
repository URL needs no frontend rebuild or deploy.

## Manually generate and upload

Use Node 20.6+ with the existing site variables in a private, Git-ignored env file.
For uploading, additionally set **one** writer credential in that local file:

```dotenv
SENSENET_API_KEY=<private-writer-api-key>
# Alternatively: SENSENET_ACCESS_TOKEN=<private-bearer-token>
```

These credentials must never have a `REACT_APP_` prefix or be added to Netlify
build settings. The public site needs no writer credential. The generator reads
the public content inventory anonymously even when the writer can read private
content. Configure only the write rights needed for the chosen sitemap destination.

Create the parent folder and arrange its public-read/versioning settings in the
existing SenseNet administration workflow. The tool creates a `File` if absent,
or overwrites that exact existing unlocked File. It never creates parent folders,
changes ACLs, publishes drafts, approves content or unlocks checked-out files.

Preview the complete XML locally, with no writer credential or repository writes:

```powershell
node --env-file=.env.site-private scripts/update-sitemap.mjs --output temp/sitemap-preview.xml
```

After reviewing the site variables and preview, create/update the repository file:

```powershell
node --env-file=.env.site-private scripts/update-sitemap.mjs
```

`npm run sitemap:update` is the same uploader, using CRA's production dotenv
files or already-set shell variables. Run it after publishing, materially updating,
renaming or withdrawing content. It regenerates the full list rather than keeping
a second URL inventory. No automatic update hook is installed.

Before writing, the tool inspects the destination and checks current-user
`Open,Save` on an existing File or `Open,AddNew` on its parent when creating one.
Missing/denied permissions stop the operation. An existing file must already be
publicly readable with an XML MIME type. The complete generation must succeed
before any upload. An unchanged XML skips the write entirely. The multipart upload
uses `Overwrite=true`, `ContentType=File` and the exact configured filename.
Success is reported only after an anonymous XML download matches the generated
bytes. If versioning/approval or origin caching hides the uploaded version, the
command fails and directs the operator to the normal publication workflow.
It does not retry a write whose outcome is unknown.

## Content selection and failure behavior

Queries stay in the exact `REACT_APP_DATA_PATH` subtree, with automatic system and
lifespan filters enabled and `Hidden:0`. File, SystemFolder and the configured
Widget type families are excluded. A Layout at an ordinary public route remains
eligible, because Layout content can itself be a page in this engine.
Parenthesized configuration branches, unsafe/sibling paths and the sitemap file
itself are rejected. Keep non-page data in technical branches or mark it Hidden;
the engine's other public content routes are otherwise treated as pages.

Paging uses stable Id ordering and continues to an empty page even if the server
caps page size. Failed/malformed/repeated/incomplete responses, empty eligible
results and size overflow stop generation before uploading. Requests are bounded;
inventory fetches share a two-minute deadline. The single-file implementation
supports at most 50,000 queried records and 50 MiB of XML; larger sites require
partitioning, and are never silently truncated.

Entries are encoded, XML escaped, deduplicated and sorted. `lastmod` is the valid
non-folder `ModificationDate` (ISO or legacy .NET date), never generation time.
Folder timestamps are omitted because they may not describe their child listings.

## Caching and free-plan usage

The previous Function/durable 24-hour cache is removed. Proxy responses follow
the SenseNet origin's HTTP caching headers and Netlify's proxy behavior; static
`_headers` rules do not override proxy response headers. Inspect `Cache-Control`,
ETag/Last-Modified and `Cache-Status` on the deployed URL before assuming an exact
freshness interval. The local upload verifier bypasses normal browser caching.

There is no Netlify Function compute for the sitemap or robots. Proxy requests,
response bandwidth and normal deploy usage still count against the hosting plan;
SenseNet storage/traffic also remain subject to its own limits. No plan upgrades,
auto recharge or paid services are enabled by this change.

## Verification

```powershell
npm run test:sitemap
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
$env:CI = 'false'
npm run build
```

The build retains existing unrelated frontend lint warnings. Inspect the build
output for one external proxy and a static robots reference, with no Function
targets or deployed function source files.

Read-only checks using each site's private environment:

```powershell
node --env-file=.env.site-private scripts/verify-sitemap.mjs
node --env-file=.env.site-private scripts/verify-sitemap.mjs --repository
node --env-file=.env.site-private scripts/verify-sitemap.mjs --origin https://preview.example
```

The first checks a generated preview; the second checks the public stored file;
the third checks the Netlify proxy and static robots route. `--output` optionally
saves XML for local inspection. Verify these for each independent site:

1. `/sitemap.xml`: HTTP 200 and XML MIME type, correct canonical origin and home
   URL, with no technical paths or another site's entries.
2. `/robots.txt`: the canonical `/sitemap.xml` address.
3. Ordinary home/article routes: the SPA still loads.
4. Run the uploader twice: the second should report `updated:false` with the
   same source data; article dates remain unchanged.
5. Publish a test article and rerun: the public stored XML and proxy eventually
   reflect the addition according to the origin cache headers, with no new deploy.

Netlify Dev can test the generated rewrite after building:
`netlify dev --offline --dir build --framework '#static' --no-open`.
Live CDN cache behavior still requires a deployed URL.

References: [Netlify proxy rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/),
[Netlify caching](https://docs.netlify.com/build/caching/caching-overview/),
[SenseNet upload](https://docs.sensenet.com/api-docs/content-management/04-upload/),
[SenseNet API keys](https://docs.sensenet.com/tutorials/authentication/how-to-authenticate-apikey/).
