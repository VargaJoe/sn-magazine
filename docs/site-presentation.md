# Repository-managed Page stylesheets

The renderer follows the existing SenseNet model:

URL + configured repository/base path → Context Content → resolved Layout (Page) →
PageTemplate string → child Widget contents.

A Layout currently combines Page metadata with the string that selects a bundled
React PageTemplate. Different contexts can resolve different Pages and templates
within the same site. This change adds CSS File references to that selected Page.

## Native Content contract

The public Layout CTD adds one optional field:

    <Field name="Stylesheets" type="Reference">
      <DisplayName>Page stylesheets</DisplayName>
      <Configuration>
        <AllowMultiple>true</AllowMultiple>
        <AllowedTypes><Type>File</Type></AllowedTypes>
      </Configuration>
    </Field>

This uses the native [SenseNet Reference field](https://docs.sensenet.com/concepts/fields/09-reference/).
Upload ordinary CSS File contents anywhere under /Root, then reference them from
Layout.Stylesheets in the desired cascade order. Several Pages can reference the
same files. The renderer expands Stylesheets alongside CustomRoot in the existing
Page/widget query; it accepts expanded File contents with Path and Type fields.

For example, a Page can reference these two Files:

    /Root/Content/example/assets/base.css
    /Root/Content/example/assets/article.css

PageTemplate remains a string such as leisure-simple or wide. Widget selection,
PortletZone, Index and widget context binding keep their current meaning. CSS can
change layout geometry within the selected template; new HTML structures and new
widget business logic still require React code in this slice.

There is no separate site manifest or CSS inheritance mechanism. Existing Page
resolution determines the Page; an inherited Page brings its own Stylesheets.
CTD field inheritance is separate from the path-based Page lookup. The current
query matches the context type name and does not implement a CTD-parent lookup.

## Loading, fallback and assets

Page CSS links are appended after the existing static head styles. The expanded
reference order is preserved and duplicate URLs are removed. Only native File
paths on the configured repository origin under /Root are accepted; external
URLs, traversal outside /Root, encoded separators, queries and fragments are
rejected. Links carry data-sn-page-stylesheet and data-sn-page for inspection.

Navigation immediately removes the previous Page's links. Delayed responses from
an earlier navigation cannot replace the current Page, widgets or styles. Missing
Pages, missing context, failed requests and empty/invalid references leave the
bundled CSS active. Older repositories without this field keep their existing
rendering; only an explicit missing-Stylesheets schema error triggers a retry
without that expansion.

Stylesheet Files and their assets must be readable by visitors for public sites.
The browser loads link URLs directly, without the app's OIDC bearer token. Serve
CSS with text/css. Normal repository/browser cache headers apply; CSS is not
polled while a Page remains open. Revisit/reload the Page to fetch current metadata;
use a new File path when immediate cache invalidation is needed.

Relative asset URLs resolve beside the CSS File on the repository server:

    @font-face { font-family: SiteText; src: url('./fonts/site-text.woff2'); }
    .header { background-image: url('./images/header.svg'); }

Cross-origin fonts also require the repository's CORS policy to allow the app
origin. The same permissions and correct MIME types apply to fonts/images.

## Verification and rollback

Use the real [local SenseNet starter](../deploy/local/README.md) and its public
sample to verify A → B → A, ordered CSS overrides, a Page without CSS, a different
React template and a relative SVG asset. Private live-site exports are optional
local fixtures and must remain ignored.

    $env:CI='true'; npm.cmd test -- --watchAll=false --runInBand
    $env:CI='false'; npm.cmd run build

Clear a Page's Stylesheets references and revisit it to return to the bundled
CSS. The PageTemplate field does not need to change. The field is optional and
existing Page/widget content values do not require migration. Upgrade Layout by
adding this field to the existing CTD; preserve any repository-specific fields.

This feature does not redesign or deploy either live site. PR
[#115](https://github.com/VargaJoe/sn-magazine/pull/115) remains a separate design
experiment. Separate repository PageTemplate Content/HTML and the native SenseNet
application framework remain future work.
