# Repository-configured page composition

`editorial-flow` is a reusable React PageTemplate with three native Widget zones:
`header`, `main` and `footer`. The selected Layout still plays the Page role.
Its child Widgets select the section renderers and data sources. The repository
controls the composition through the existing fields; there is no second page
manifest or site-name registry.

The React template supplies document landmarks and section rendering capabilities.
The editor chooses which sections appear, their order, headings, introductions,
selected contents and queries in SenseNet. Adding a new kind of HTML renderer
requires application code; arranging the available sections requires repository
edits and a page revisit/reload. Repository HTML templates remain a separate
future capability.

## Page and stylesheet setup

On the chosen Layout:

- Set `PageTemplate` to `editorial-flow`.
- Reference the site's theme CSS and then the shared section CSS through ordered
  `Stylesheets` File references. The latter source is
  `deploy/local/themes/sections.css`; upload it as a visitor-readable CSS File.
- Keep other contexts on their existing Pages/templates. A homepage can use the
  flow template while articles retain the existing article template.

Copy or snapshot the Page and its child Widgets before experimenting. Existing
Widgets can be retained with `Hidden=true`; do not delete content to change a
homepage composition.

## Section catalogue

All names below are `ClientComponent` values. Use `WidgetContentView` for static
text and individual content; use `WidgetContentCollection` for lists.

| Component | Content type | Purpose |
| --- | --- | --- |
| `editorial-navigation` | Collection | Site identity/logo and category navigation |
| `editorial-intro` | View | One main heading and a short editor-written introduction |
| `editorial-feature` | View | A selected article with cover, real metadata and a reading link |
| `editorial-reading-feature` | View | A selected work with its review and first translation entry |
| `editorial-stories` | Collection | A discovery grid of articles or profiles |
| `editorial-timeline` | Collection | A vertical journal/news sequence |
| `editorial-reading` | Collection | A work shelf with review and translation entry links |
| `editorial-topics` | Collection | Category doorways |
| `editorial-note` | View | A short editor note or footer text |

The reading sections expand the native `Translation` references and select the
first non-hidden reference with a valid site route by numeric `Index`. One shelf
item is a work, rather than an individual chapter. The action uses that chapter's
native `ReaderUrl` first. Otherwise `Url` provides an explicitly labelled download;
a content route is the final fallback. External targets accept credential-free
HTTP(S) URLs and open in a separate tab. Empty covers and invalid or
sentinel publication dates are omitted. Rendered teasers and editor text are
normalized to plain text.

## Native fields

| Field | Editor control |
| --- | --- |
| `PortletZone` | `header`, `main` or `footer` |
| `Index` | Order within the selected zone; give Widgets distinct values |
| `Hidden` | Include or retain a disabled section |
| `ClientComponent` | Section type from the catalogue |
| `Title` | Section heading or navigation label |
| `ComponentDescription` | Short section introduction |
| `ComponentContent` | Introduction/note text; separate rich-text paragraphs are retained as plain text |
| `ContextBinding` | Current context, current site, or a selected `CustomRoot` |
| `CustomRoot` | A pinned article/work or an alternative collection root |
| `RelativePath` | Collection path relative to the binding, where the CTD supports it |
| `ChildrenLevel` | `child`, `deep` or `none` for collections |
| `ContentQuery` | Automatic discovery or an explicit editor-selected set |
| `Expand` | Additional native references, where the CTD supports it |

Static intro/note Widgets use the View type because the existing SimpleText CTD
does not have a `ClientComponent` field. The introductory section supplies the
page's single `h1`; subsequent sections use lower heading levels.

For example, a standard native View Widget can pin an article:

```json
{
  "ContentType": "WidgetContentView",
  "ContentName": "Featured reading",
  "Fields": {
    "Title": "An editor's choice",
    "ClientComponent": "editorial-feature",
    "PortletZone": "main",
    "Index": 20,
    "ContextBinding": ["customroot"],
    "CustomRoot": "/Root/Content/example/articles/a-story"
  }
}
```

A Collection Widget can use `ContextBinding=["currentsite"]` and
`ChildrenLevel=["deep"]` with a query such as:

```text
+TypeIs:Article +InTree:"/Root/Content/example/articles" +Hidden:0
.REVERSESORT:PublishDate .TOP:5
```

Use the content type names and publication rules of the actual repository.
SenseNet descending query syntax is `.REVERSESORT:PublishDate`. A SmartFolder
binding uses that folder's own query. Collections are bounded to 40 items and use
the repository's normal automatic/lifespan filters. Stale navigation and changed
Widget requests cannot replace the current section results.

## Editorial use and local acceptance

A personal journal can lead with a thematic featured article, companion stories,
an automatic timeline and category entry points. A reading archive can instead
lead with a work and its first chapter, followed by work shelves, author profiles
and archive discovery. These are different native Widget compositions of the
same template, not two applications with embedded content lists.

Keep the current operator's site selections, copy, export data and snapshots in
ignored local runtime files. Public source contains reusable renderers/styles.

Verify with a real repository:

1. Inspect each homepage's Layout and child Widget fields.
2. Follow a featured article and return home; article templates and CSS should
   retain their previous behavior.
3. Follow a translation entry to a real first chapter.
4. Change a section's `Index` and `Title` in SenseNet, reload without rebuilding,
   and verify the new order and label. Restore the original values afterward.
5. Check desktop and 390px mobile layouts, missing routes and managed SEO metadata.

Automated regression command:

```powershell
$env:CI='true'; npm.cmd test -- --watchAll=false --runInBand
```
