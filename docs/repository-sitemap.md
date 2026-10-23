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
renaming or withdrawing content. For scheduled articles, run it when the
PublishDate is reached as well: the stored XML cannot acquire a new URL just
because time passed, and a frontend deploy does not regenerate it. It regenerates
the full list rather than keeping a second URL inventory. No automatic update
hook is installed.

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
Widget type families are excluded. Parenthesized configuration branches,
unsafe/sibling paths and the sitemap file itself are rejected.

Within that inventory, an internal page qualifies when it is the home page, has
an exact stored `DisplayZone` choice `menuitem` or `menuicon`, or has a valid
`PublishDate` at/before the generation cutoff. The cutoff is captured once before
paging. Published articles/reviews stay eligible without menu choices: list
widgets link to them independently. An unmarked, undated Folder/Layout/test page
does not qualify merely because its direct URL can render. Choice labels such as
`Menu item` and substring matches are not stored choice tokens.

Undated `LeisureMangakaBio` author biographies have one additional inclusion
path: a rendered list on an eligible home/menu page must actually return them.
Discovery resolves the existing inherited Layout and its displayed widget zones,
then checks the list's effective ContentQuery against candidate profile IDs.
It supports the internal generic cards in `list-review`, `list-news` and
`list-news-third`, with ordinary current-context or expanded custom-root child
collections inside this site. There are no per-site profile paths or IDs in code.
The report records the referring page in `linkedFrom`. Missing PublishDate alone
does not disqualify a linked biography; hidden ancestry, invalid/future dates and
the other exclusion rules still take precedence. Other undated articles remain
excluded unless they independently qualify as navigation.

Discovery declines ambiguous equal-depth Layout choices, unsupported views or
templates, deep/Workspace/relative/SmartFolder bindings and windowed queries
(`.TOP`/`.SKIP`), rather than guessing that they expose a profile. Needed metadata
or query failures abort generation before uploading. Discovery is anonymous,
paged and shares the same deadline and record bound as the inventory; it can
read shared Layout metadata outside the site root, but eligible URLs and profile
result checks remain restricted to the configured site.

`Hidden` values true/1/"true"/"1" exclude a record and every descendant within the
configured site subtree. A second anonymous, paged query reads public hidden-node
metadata without type-family exclusions, so a hidden SystemFolder/Widget ancestor
cannot be missed. This metadata query disables system/lifespan filtering for ancestor
flags while retaining anonymous permission checks; page eligibility still uses the normal filtered query. Both
queries share the same two-minute deadline and stop on incomplete responses.
A non-empty invalid
or future PublishDate excludes even a navigation item; ISO timestamps with an
explicit timezone and legacy .NET dates are supported. Null/blank dates and
DateTime.MinValue (`0001-01-01T00:00:00Z`) mean unset, so they do not qualify an
unmarked article as published. Link-only records (`SoftLink`, `Banner` or a
non-empty `Url`) are omitted: their linked destination is not their repository
record's own canonical page.

This is an explicit inclusion policy, not a crawl of every configured widget
query. The engine supports custom roots, deep queries and SmartFolders, so an
article is not required to sit below a menu category. Published entries without
an eligible navigation ancestor are listed as review warnings rather than
silently dropped. A hidden ancestor takes precedence over menu or publication
eligibility, including on nested descendants and the home page. No site names
or second site registry is used.

Paging uses stable Id ordering and continues to an empty page even if the server
caps page size. Failed/malformed/repeated/incomplete responses, empty eligible
results and size overflow stop generation before uploading. Requests are bounded;
inventory fetches share a two-minute deadline. The single-file implementation
supports at most 50,000 page/hidden records and 50 MiB of XML; larger sites require
partitioning, and are never silently truncated.

Entries are encoded, XML escaped, deduplicated and sorted. `lastmod` is the later
valid source date of `PublishDate` and `ModificationDate` (ISO or legacy .NET),
never generation time. For an article prepared in October and scheduled for
December, it remains excluded until publication; the first run at/after release
uses its December publication date. A later edit advances lastmod to the later
modification date, while rerunning with unchanged source data preserves it.
Published article/detail content and linked author biographies receive it even
when SenseNet reports `IsFolder=true`: articles can contain assets. Undated folder/navigation collection
timestamps remain omitted because they may not describe their child listings.
Missing, malformed and DateTime.MinValue source dates are ignored; if one date is
usable it is used, and if neither is usable lastmod is omitted. This fallback
does not bypass the invalid/future PublishDate exclusion rule.

The lifespan filter covers `ValidFrom`/`ValidTill`; it does not replace the
explicit PublishDate gate. Anonymous reads retain SenseNet's permission and
published-version visibility. Omitting an entry from a sitemap does not block
direct page access or search indexing. The frontend's route resolver has no
equivalent Hidden/PublishDate guard; a separate noindex/access decision is needed
if direct URLs must be unindexable or inaccessible.

## Review changes before uploading

Compare against the current public repository File without writing to it:

```powershell
node --env-file=.env.site-private scripts/compare-sitemap.mjs --output temp/sitemap-review
```

If the stored File was removed or moved, supply a previously saved generator XML
instead. The command fails on an unavailable default baseline; it never treats a
404 as an empty sitemap or automatically falls back to an old snapshot.

```powershell
node --env-file=.env.site-private scripts/compare-sitemap.mjs --baseline temp/saved-sitemap.xml --output temp/sitemap-review
```

`sitemap:compare` is the equivalent npm script with CRA production dotenv loading.
The output directory contains `proposed.xml`, a `comparison.json` with full
retained/removed/added entries, reasons and review warnings, and `changes.csv`.
The summary separates URL changes from retained-page lastmod changes. When a URL
is absent from the anonymous inventory, the reason is `not-in-public-inventory`;
the tool does not guess whether it was hidden, deleted, unpublished or denied.
The baseline reader accepts the plain urlset format emitted by this generator,
rejects other-site/duplicate/unsupported entries, and does not process DTDs or
external entities. CSV cells are escaped and formula-leading text neutralized.

All comparison requests are anonymous GETs, including when local writer
credentials exist. Outputs contain real site URLs and paths: keep them in a
private ignored directory, review them, then explicitly run the uploader when
the selection is accepted. Comparison never uploads, changes ACLs or deploys.

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
[SenseNet API keys](https://docs.sensenet.com/tutorials/authentication/how-to-authenticate-apikey/),
[SenseNet date/lifespan queries](https://docs.sensenet.com/api-docs/querying/04-date/),
[Sitemap lastmod](https://www.sitemaps.org/protocol.html),
[Search indexing controls](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
