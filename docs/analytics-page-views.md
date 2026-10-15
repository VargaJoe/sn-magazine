# Page titles and React page views

The site name comes from the route content's expanded SenseNet `Workspace`,
not from a hostname table or a new configuration service. The home content's
`DisplayName` supplies its title; elsewhere the format is
`Workspace.DisplayName - context.DisplayName`. The configured `REACT_APP_DATA_PATH`
also identifies the home content when its Workspace reference is absent.
API URL, content root, canonical host and existing branding environment values
remain per-build configuration. They are not a runtime JSON configuration layer.

`PageWrapper` resolves the route content (including async article data and
Workspace), then its inherited Layout and Widgets. Only the current navigation's
resolved context reaches `AnalyticsTracker`. Request generations and an immediate
render gate prevent stale responses from rendering or publishing a previous page.
Layout-query failure retains automatic layout fallback; context failure shows the
existing maintenance template without inventing a page view.

`AnalyticsTracker` centrally validates the title, sets `document.title` synchronously
in a layout effect, then pushes exactly once for that resolved navigation:

```js
{ event: 'react_page_view', page_title: document.title, page_path: location.pathname }
```

The queue is initialized if GTM has not loaded. Existing queue entries are preserved.
StrictMode effect replay, store updates and repository-provider refresh do not
republish a navigation. New pushes, replacements, query/hash changes and back/forward
visits are separate navigations; `page_path` deliberately contains only the pathname.
An abandoned navigation with no valid content/title sends no event. Returning to an
earlier history entry still sends a fresh event, even if the intervening page failed
or was still loading. Invalid names produce no synthetic fallback title/event.

`partial-head.js` shares the resolved title for Open Graph metadata, gets descriptions
from the content/Workspace `Description`, and computes canonical URLs from the
configured site host plus the browser route. The login/error layouts no longer write
competing titles. Both static HTML templates have an empty, site-neutral title.

## Implementation entry points

- `public/index.html`, `public/template.html`: neutral static titles.
- `src/page-meta.js`: validated title construction from existing SenseNet data.
- `src/AnalyticsTracker.jsx`: ordered title/metadata/event coordination and deduplication.
- `src/components/page-wrapper.js`: navigation-bound async resolution; mounts the tracker.
- `src/components/layouts/partial-head.js`: shared title, dynamic description/canonical.
- `src/AnalyticsTracker.test.jsx`, `src/components/page-wrapper.test.js`: race/navigation regressions.
- `scripts/verify-page-meta.cjs`: browser acceptance checks, optionally using a local build override.

## GTM and verification limits

The engine queues navigation events for an externally configured GTM container.
It does not define a container ID, add gtag.js or a GA snippet, or provide a
server-side HTML injection mechanism. Container configuration and loading belong
to the deployment that hosts the engine.

Putting a dynamic GTM script first in head and a working noscript iframe immediately
after body requires an existing host-side configuration/injection point; a
React-only runtime insertion cannot provide source HTML or work with JS disabled.
That deployment integration and Search Console verification remain unverified.
GTM auto events emitted before the repository response cannot know the eventual
title; this change guarantees the ordered custom page view, not GA4/GTM delivery.

## Verification

```powershell
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
$env:CI = 'false'
npm run build
```

Builds retain pre-existing unused-variable warnings in unrelated widgets.
Strict `CI=true` builds treat those warnings as errors.

Repeat this manual smoke with at least two independent site configurations:

1. Directly open `/`, a section, and an article. Check the tab title and console:
   `window.dataLayer.filter(x => x.event === 'react_page_view')`.
   A fresh load has one entry; its `page_title` equals `document.title` and its
   `page_path` equals `location.pathname`.
2. Follow actual site links home → section → article → home, then use Back/Forward.
   Each completed navigation adds one entry. Slow the network and go back while
   the next page is loading; the return visit also adds one entry.
3. Check View Source: empty title, no site name and no `W3.CSS Template`.
4. Use GTM Preview/GA4 DebugView separately to verify the existing container maps
   `react_page_view`, `page_title`, `page_path` as expected.

Browser automation requires Playwright with Chromium available (or its package
directory supplied via `NODE_PATH`):

```powershell
node scripts/verify-page-meta.cjs --origin https://site-a.example --section /section --article /section/article --name 'Example Site A'
node scripts/verify-page-meta.cjs --origin https://site-b.example --section /section --article /section/article --name 'Example Site B'
```

Add `--build <absolute-build-directory>` to test a locally built version without
deploying. The browser replaces only that host's static assets/HTML; its real
SenseNet API and repository data remain in use. The script checks direct entry,
real SPA links, back/forward, title at the instant of push, event count and neutral
source HTML. It also holds a real API request, returns to the previous page, then
releases the stale response. Without `--build` it checks the actual deployed version.
