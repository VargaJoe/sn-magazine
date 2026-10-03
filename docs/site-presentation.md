# Repository-managed site presentation

The React engine can load a public presentation manifest for each configured
site. This separates CSS and widget-zone structure from site-specific React
pages. It does not change FotelVándor or MANGAjánló's design or repository content.

## Compatibility and activation

- The site still comes from `REACT_APP_API_URL` and `REACT_APP_DATA_PATH`.
- By default the app requests
  `<site>/(structure)/Site/presentation.json` once when the site configuration
  mounts. `REACT_APP_PRESENTATION_PATH` can override this with a site-relative
  path or a full `/Root/...` repository path.
- A missing file (404) leaves the existing CSS and page templates active. Invalid
  JSON, an unsupported manifest, access errors, network errors, and an eight-second
  timeout also preserve the built-in layout. These do not prevent content loading.
- Existing `Layout.PageTemplate` values such as `leisure-simple` still select
  their original React layouts. A manifest never automatically replaces them.
- To select a declarative layout, set `Layout.PageTemplate` to
  `repository:<name>`, for example `repository:magazine`. Layout inheritance and
  widget selection continue to use the existing SenseNet queries.
- An unavailable manifest or unknown declarative layout name falls back to
  `leisure-simple`, including its existing `side` and `content` zones. Additional
  zones are available only when their declarative layout is valid.

The new manifest CSS applies to **all pages of that site**, including existing
React layouts. Scope selectors to `.sn-site-layout` or a declared layout class
if the stylesheet should affect only new layouts.

## Manifest version 1

Upload a normal File content named `presentation.json` to the site folder:

```json
{
  "version": 1,
  "stylesheets": ["skin.css"],
  "layouts": {
    "magazine": {
      "className": "magazine-layout",
      "zones": [
        { "name": "header", "className": "magazine-header" },
        { "name": "side", "className": "magazine-navigation" },
        { "name": "content", "className": "magazine-content" },
        { "name": "footer", "className": "magazine-footer" }
      ]
    },
    "reading": {
      "className": "reading-layout",
      "zones": [
        { "name": "content" },
        { "name": "side" }
      ]
    }
  }
}
```

`stylesheets` and `layouts` can be omitted, so a CSS-only first step is possible.
Stylesheets load in declaration order after the existing static head styles;
duplicates are removed. Files must be on the configured repository origin and
under `/Root/`. Relative stylesheet paths resolve next to the manifest; absolute
repository paths such as `/Root/Skins/shared/base.css` are also supported.

The manifest and its assets must be anonymously readable. The manifest uses
`fetch` without credentials and a browser cache revalidation request. Cross-origin
repositories must allow the site's origin via CORS. No OIDC bearer token is sent
to CSS, font, image or manifest URLs.

The manifest is revalidated on page reload; it is not polled while a page is
open. CSS, images and fonts use the repository's own cache headers. If a cached
stylesheet needs an immediate refresh, change its reference in the manifest,
for example `skin.css?v=2`.

Layout and zone names are case-sensitive identifiers: a letter followed by
letters, digits, underscores or hyphens. Optional `className` values contain
space-separated CSS class names following the same rule. Each layout must
contain a `content` zone; zone names must be unique within it. Any invalid
declaration rejects the whole manifest before applying its stylesheets.

## Structure, styles and assets

The renderer produces a neutral wrapper and the ordered zone wrappers:

```html
<div class="sn-site-layout magazine-layout" data-sn-layout="magazine">
  <div class="sn-site-zone magazine-header" data-sn-zone="header">...</div>
  <div class="sn-site-zone magazine-navigation" data-sn-zone="side">...</div>
  <div class="sn-site-zone magazine-content" data-sn-zone="content">...</div>
  <div class="sn-site-zone magazine-footer" data-sn-zone="footer">...</div>
</div>
```

Each zone renders the selected Layout's widgets whose `PortletZone` exactly
matches its name, preserving repository `Index` order. If there are no widgets
at all, the existing content-type fallback still renders in `content`. Existing
widget types and `ClientComponent` names keep their current behavior. Updated
widget properties now reach the renderer even when a widget ID remains the same.

CSS owns columns, spans, responsive behavior, colors and spacing. For example:

```css
.magazine-layout {
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
  gap: 1rem;
}
.magazine-header, .magazine-footer { grid-column: 1 / -1; }
@media (max-width: 48rem) {
  .magazine-layout { grid-template-columns: minmax(0, 1fr); }
}
```

This is an illustrative structure, not either live site's design. A different
site can use a different manifest and CSS with the same React engine. Several
named layouts can coexist within one site for different page types.

CSS assets resolve relative to the **CSS file**, using standard browser behavior:

```css
@font-face { font-family: SiteText; src: url('./fonts/site-text.woff2'); }
.magazine-header { background-image: url('./images/header.svg'); }
```

Serve CSS with a CSS MIME type and images/fonts with their correct types. The
manifest cannot load JavaScript or define new widget implementations; new widget
behavior still requires a bundled React component. Static W3/App styles remain
the compatibility base. Runtime host-to-site resolution and the SenseNet native
application framework are separate future steps.

## Verification and rollback

```powershell
$env:CI='true'; npm test -- --watchAll=false --runInBand
$env:CI='false'; npm run build
```

For the local full-app browser fixture (no production writes):

```powershell
$env:REACT_APP_API_URL='http://127.0.0.1:4179'
$env:REACT_APP_DATA_PATH='/Root/Content/smoke'
$env:REACT_APP_AUTH_URL='http://127.0.0.1:4179/auth'
$env:REACT_APP_CLIENT_ID='presentation-smoke'
$env:REACT_APP_SITE_HOST='http://127.0.0.1:4179'
$env:REACT_APP_PRESENTATION_PATH='/(structure)/Site/presentation.json'
$env:BUILD_PATH=Join-Path $env:TEMP 'sn-magazine-presentation-smoke'
$env:CI='false'
npm run build
node scripts/presentation-smoke-server.cjs $env:BUILD_PATH
```

Open the local fixture links at `http://127.0.0.1:4179/__scenarios`. Verify:

1. Alpha and Beta use the same application bundle but different repository CSS,
   zone order and geometry, including a repository SVG asset.
2. Open a child page and return home: content changes without losing site CSS.
3. Legacy uses `leisure-simple` with no manifest. Broken JSON and an unknown
   declarative template also render the existing side/content layout.
4. Reload after changing a test manifest: it is revalidated rather than stored
   in the content-binding cache.

Before using a real repository, preview on a test Layout first. Restoring its
previous `PageTemplate` rolls back structure; removing the manifest (or clearing
its stylesheet list) rolls back site CSS on reload. Existing content-type
definitions and deploy scripts need no change. This session does not upload
assets, modify either live repository tree, or deploy an app.

## Earlier R5 branch

PR [#115](https://github.com/VargaJoe/sn-magazine/pull/115) remains a separate
FotelVándor design experiment. Its automatic homepage switch and site-specific
queries are not part of this engine feature. Neither its branch nor design
references are removed. A future design can use this presentation capability
without bringing that automatic switch into the shared engine.
