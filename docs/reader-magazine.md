# Native reader magazine pages

`reader-magazine` is an optional three-zone PageTemplate. A site can select it on
its own Layouts while another site retains `editorial-flow` or its existing
templates. Its CSS is repository-hosted and scoped to `.reader-magazine`.

The native catalogue, destinations and editorial annotations configure the
experience. Source code contains no hostname/site registry or editorial item
selection. Collection pages use the existing SmartFolder query mechanism; article
pages, archives and recommendations derive their contents from native metadata.

## Installation and source Widget

Import the two new CTDs from `deploy/package`: `EditorialAnnotation` under Folder,
and `WidgetMagazineSource` under WidgetContentCollection. Existing article CTDs
do not need changes. Type names in XML and repository names are case-sensitive;
preserve their exact spelling when an opt-in naming provider is enabled.

On the selected site-owned Layout:

1. Set `PageTemplate=reader-magazine` and reference the uploaded
   `deploy/local/themes/reader-magazine.css` through `Stylesheets`.
2. Permit `WidgetMagazineSource` in that Layout's native `AllowedChildTypes`,
   alongside its existing Widget types. There is no need to replace a shared
   Layout used by other sites.
3. Add one `WidgetMagazineSource` with `ClientComponent=magazine-source`,
   `PortletZone=data`, `Hidden=false`. This is configuration, so the template
   does not render its own section.
4. Set `ContentQuery` to the site's article/category/SmartFolder/annotation
   catalogue, with an explicit subtree, normal filters, and deterministic
   `.SORT:Id`. Keep individual display-section queries on their own Widgets.
5. Set native `ArchivePage`, `CollectionsPage`, `SearchPage`, `AboutPage`,
   `NewsRoot` References and ordered `CategoryRoots` References. Optional
   `NewsWindowDays` defaults to 30. Optional `PageTitlePattern`, such as
   `{title} | {site}`, supplies a fallback before the existing SEO/analytics
   pipeline; explicit content or Layout metadata keeps priority.

The catalogue uses 200-item pages, up to 5,000 records, and fails closed on
incomplete, repeated, malformed or outside-root pages. Loading is timed out,
abandoned requests are ignored, and a new navigation cannot render stale results.
Hidden, technical, missing-date and future articles are excluded from discovery.
Configured hidden category roots are also excluded. This is presentation filtering,
not a replacement for repository permissions.

## Section catalogue

All names are `ClientComponent` values. Header/footer menus use native Collection
Widgets containing ordered SoftLinks (`DisplayName`, `Url`, `Index`). Text and
context views use View Widgets. Existing `Title`, `ComponentDescription`,
`ComponentContent`, `ContextBinding`, `CustomRoot`, `ChildrenLevel`, `ContentQuery`
and `PortletZone` remain editor controls.

| Component | Behaviour |
| --- | --- |
| `magazine-navigation` | Native SoftLink menu; five primary mobile links and an expandable remainder; footer variant follows the Widget zone |
| `magazine-identity` | One h1, editor text and the StartHere anchor |
| `magazine-latest` | Native query selection; one featured story plus six cards, and archive link |
| `magazine-news` | Entire section omitted when NewsRoot contains no story inside the configured freshness window |
| `magazine-start` | Annotation-selected navigation tiles in native Index order |
| `magazine-category-preview` | Three stories and total count from a pinned category root |
| `magazine-about` | Editor-written text and native AboutPage destination |
| `magazine-category` | Current-category discovery, newest/title sorting |
| `magazine-books` | Publisher groups, publication order, original order and chronology; unknown orders remain visible in an unplaced group |
| `magazine-archive` | Complete reverse-chronological archive, publication-year groups/jumps and category counts; filtering creates no additional indexable URL |
| `magazine-hub` | Current SmartFolder's native query, optional Description intro and ordered/unplaced rows |
| `magazine-collections` | Automatic Series/BookAuthor directory; authors require two stories; native hub links or an immediate hash-filter view for new metadata values |
| `magazine-search` | In-page title/subtitle/description/series/expanded-author search |
| `magazine-article` | Readable article, native metadata, series neighbours, related stories, collapsed links/comments and distinct latest-in-category cards |
| `magazine-text` | About/legal/editorial text with a single page heading |

For example, a homepage can arrange identity → latest → conditional news → start
tiles → category previews → about. Other Layouts can reuse the same source/menu
Widgets while selecting an archive, category, hub or article context view.

## Annotations and ordinary content metadata

Create site-owned `EditorialAnnotation` records in a technical site folder. Keep
one record per Target to avoid conflicting editor instructions.

| Field | Contract |
| --- | --- |
| `Target` | Native Reference to an article or navigation destination |
| `Series` | Optional editorial override; otherwise use the article's existing Series |
| `SequenceNumber` | Canonical series order for article previous/next; positive numbers only |
| `PublisherGroup` / `PublisherSequence` | Edition grouping and its independently known order |
| `OriginalSequence` | Original publication order, without borrowing a different sequence |
| `TimelineSequence` | World chronology, without borrowing publisher order |
| `Featured` | Highlight within the homepage latest query's eligible selection |
| `StartHere` | Include a visible destination in the start tiles; native Index controls order |
| `AccentColor` | Optional category colour, limited to a six-digit hexadecimal value |

Zero/null means unknown. Missing or duplicated canonical sequence values disable
previous/next links rather than invent adjacency. Placeholder annotation rows can
have a DisplayName/Series/sequence and no Target: a hub renders them as unlinked
volumes without a review. Never invent missing-volume lists to populate a mockup.

Existing article `Series`, `Tags`, `PublishDate` and `BookAuthor` drive discovery.
BookAuthor may be a single Reference in a repository; its expanded object is
supported as well as multi-reference response shapes. The widget does not change
that schema or infer coauthors from titles. Preserve native editorial data when
adding local fixtures. Recommendations rank same-series items before shared Tags,
exclude the current article, and deduplicate later category suggestions.

A native SmartFolder can use a site-scoped Series or BookAuthor query and inherit
the site's SmartFolder Layout. New metadata values are immediately usable from
the automatic directory, even before an optional named SmartFolder/intro exists.
Do not change existing slugs to install this presentation.

## Rich text, assets and verification

Article rich text preserves paragraphs, headings, lists and tables. It removes
scripts, embeds/forms/events, unsafe links, hidden editor paragraphs and remote
media; article h1 elements become h2 because the page owns the main heading.
Images stay on the configured repository origin. Excerpts fall back to a visible
body paragraph when Lead/Description is empty. Comments mount only after opening
the collapsed details and only when an environment has a configured provider.

The local theme includes unmodified Lora and Open Sans font files with their OFL
licenses under `deploy/local/themes/fonts`. Upload them as visitor-readable Files,
register them with a repository-relative `@font-face`, and keep the font licenses.
The theme uses Lora/Open Sans family names; CSS family aliases may be used to keep
registrations distinct from other site themes.

The optional `WidgetMagazineSource.BrandingFolder` Reference selects a native
Folder inside the configured site root. It contains `header-desktop.png` (205×44),
`header-desktop-2x.png`, `header-mobile.png` (163×32), `header-mobile-2x.png`,
`favicon.ico`, `favicon-32.png`, `favicon-192.png`, and `apple-touch-icon.png`.
Header images are complete lockups, with responsive `<picture>`/density selection.
Icons are owned by the reader template and removed when it unmounts. Missing,
hidden, or outside-site Folder references retain the generic text/book brand.
Actual artwork and site-specific configuration belong in the target repository,
not in the application bundle or this package. Existing source Widgets without a
BrandingFolder keep their current appearance.

For a local reader preview that must display artwork before JavaScript starts,
set `READER_INITIAL_HEADER_CONFIG` to an absolute private JSON file when building.
It contains `root` (the configured site root), `name`, `theme` (local theme CSS),
and `desktop`, `desktop2x`, `mobile`, `mobile2x` (absolute original PNG paths).
The header sizes are 205×44 and 163×32, with double-sized retina assets.
Postbuild copies the unchanged bytes into `reader-initial/` and inserts a static
responsive header before the React root. React portals only the navigation into
its slot; the HTML logo remains the same DOM element throughout loading and
route changes. No preload or logo replacement script is used. This is opt-in:
the normal repository-driven branding path is unchanged without that local input.
Keep site-specific configuration, artwork and generated builds out of Git.

Run `CI=true npm test -- --watchAll=false --runInBand`, `npm run test:sitemap`, and
a production build with the target site's environment. Smoke: home → category →
hub → article → neighbour/related; archive filters and author hub; 390px menu and
keyboard focus. Change an annotation/Widget in CMS and reload the same build, then
restore the values. Check that stale news is omitted, legal/news Pages keep their
configured robots policy, scheduled articles remain noindex, and another site's
content/Stylesheet references are unchanged.
