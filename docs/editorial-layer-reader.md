# Optional magazine editorial reader

The reader can use a site-owned bibliographic catalogue independently of its
articles. Enable it by setting `WidgetMagazineSource.EditorialRoot` to a
`Folder` directly below the site's native Workspace. All source widgets used
by that site's layouts should reference the same folder. Leaving this field
empty retains the existing reader behavior.

Install the [backend extension](editorial-layer-backend.md) before setting
this reference. No article content type, MediaItem type, external repository,
site name or publisher name is built into the reader.

## Native pages and settings

`DefaultBrowseView` on the source widget controls the initial category/hub view:
`publication` (the default) or `collections`. It is repository configuration,
not a site-name rule. An explicitly opened child-order HubPage selects that
order. Later selection can use a native child page or local view state; it never
creates an ID/hash page identity.

Configure optional `CollectionRoots` with public same-site Folder references.
Their immediate native Page/SmartFolder/category children provide directory
cards; group names, descriptions, paths and layouts come from SenseNet.
For example, an author directory may contain an ordinary SmartFolder with an
author-filtering native Query and a readable Name. The client neither derives
slugs from contributor names/IDs nor parses a Query to discover an author.
Each navigable editorial collection/order links only to its explicit HubPage.
A collection without a page has no invented fallback URL. Listed items without
any visible membership remain accessible in the general catalogue.

The generic recommendation settings are `RecommendationMode`
(`collections-and-tags`, `tags`, `none`), `RecommendationCount` (0–12, default4),
`RecommendationCollectionWeight` (0–10, default2), and
`RecommendationTagWeight` (0–10, default1). Shared explicit collection matches
and shared tags contribute those weights; ties use publication date. The
reader explains the active basis. A count or both weights of zero hides the
list. These fields belong to the optional reader module; other site layouts
do not inherit its appearance or behavior automatically.

Archive years filter the already-loaded public reviews through the `year`
query parameter. The native page remains the same path; changing a filter or
following an in-page anchor preserves the loaded layout and keyboard focus.
Direct article views also wait for the canonical public catalogue: an absent,
hidden or future review is not rendered from an unchecked context fallback.
This UI rule does not replace native API publication/version/ACL protection.

Related links retain their descriptions and supported media embeds. Descriptions
are sanitized; recognized video frames and native audio/video are reconstructed
from validated sources, rather than executing raw CMS Embed HTML. Unknown or
unsafe media retains a descriptive link. Article-source Publisher and the
reviewed subject's PublisherLabel remain separate fields and labels.

## Editing with native forms

Create `EditorialItem`, `EditorialCollection` and `EditorialMembership`
records in ordinary folders below the configured root. Existing
`EditorialAnnotation` records may remain elsewhere in the same site. Add
their optional `Items` references to connect a public review to one or more
subjects. Multiple reviews can refer to the same subject. A subject needs no
dummy article when there is no review.

An item describes a known work or edition. Edition is the default; use work
for a film or a whole TV series where that is the reviewed subject. An edition
does not require a separate work record. Optional publisher, imprint,
distributor and studio labels describe the subject. An article's `Publisher`
is a different fact and is never copied into these labels automatically.

Collections describe independent series, publisher series, chronology or
curated groups. Connect their optional `HubPage` to an actual Page or
SmartFolder; matching titles do not create a relationship. A parent
collection groups its direct members and its visible descendants' members.
The same item is counted once in that pool.

Each membership connects exactly one item and collection. `Position` is a
positive integer for a verified order, or zero when unknown. `NumberLabel`
is independent display text, such as `1/A` or `3–4`; the reader never parses
it into a position or invents it from a position. Keep unknown entries
unplaced. Put a subject known only to belong to a parent hub in that parent;
do not create guessed memberships in its child orders.

`IsListed` defaults to false. Native permissions still apply. The local
backend additionally restricts anonymous access to nonpublic records. See
the backend's monotonic ACL and publication limitations before publishing a
previously restricted record; changing `IsListed` alone does not release
those native denials.

## Reader behavior

- Category pages group public reviews through explicit item memberships.
  Reviews without such a group remain under “További írások”.
- Hub pages select a collection or an independent child order. Child views
  retain the parent pool's unplaced items. “Megjelenés az oldalon” projects
  unique public reviews by publication date; it is not a stored bibliography.
- “Ismertető” counts unique public review IDs; “nyilvántartott tétel” counts
  unique listed subjects. Neither caption claims a complete series.
- Missing reviews have a readable placeholder, without a fabricated link.
  Previous/next navigation retains an immediate known unreviewed neighbour.
- Duplicate positions display a conflict and disable ambiguous neighbours.
  Duplicate memberships, duplicate review annotations, identity collisions
  and parent cycles reject the graph rather than picking a record.
- Ordinary SmartFolder query pages without a `HubPage` relationship remain
  public review lists without bibliographic ordering.
- Related-review recommendations use explicit collections and tags. An
  enabled editorial graph never falls back to legacy series/sequence fields.

Configuration is read before the public graph. The loader scopes types,
fields, references and IDs; pages in stable ID order; and derives counts
from returned canonical rows. An invalid or incomplete enabled graph shows
a load error instead of a partial result or legacy numbering. Route changes
cancel dependent requests and do not expose a previous route's results.

## Verification

The [2026-11-06 local reader review](editorial-layer-local-review.md) records the
current native configuration, independent findings, actual checks and smoke steps.

Run the compiled local reader with Docker Compose:

```powershell
./deploy/local/start-preview.ps1 -BuildDirectory '<absolute path to the local build>'
```

The default build directory is this checkout's `build/`, and the default URL is
`http://localhost:3011`. The public API/auth/site URLs are compiled into the
build; build them for the same local ports before starting. This command only
starts the `preview` service in the separate `sn-magazine-preview` Compose project; it does not recreate the
existing repository, identity or SQL services. The Nginx container serves the
build read-only, supports direct React Router URLs, has a health check and
`restart: unless-stopped`. It keeps running after the launching shell/chat ends.

For logs, stop and restart, use the same build-path environment variable:

```powershell
$env:SN_MAGAZINE_PREVIEW_BUILD = '<absolute path to the local build>'
docker compose -f deploy/local/preview.compose.yml logs --tail 50 preview
docker compose -f deploy/local/preview.compose.yml stop preview
./deploy/local/start-preview.ps1 -BuildDirectory $env:SN_MAGAZINE_PREVIEW_BUILD
```

Only compiled assets are served. The starter rejects source directories and
environment files; no repository writer credential is passed to Nginx.

From this checkout:

```powershell
$env:CI = 'true'
npm test -- --watchAll=false --runInBand src/components/magazine
./deploy/local/build-editorial-extension.ps1
```

For a manual smoke test against the local preview:

1. Open a category, a mapped hub, an ordinary author query page and a review.
2. Switch between two child orders and publication order. Unknown positions
   must remain unplaced; review and item counters must stay distinct.
3. Add a listed subject without a review and a verified membership through
   native forms. Reload the same build: the subject must appear without a
   review link. Check the immediate previous/next placeholder.
4. Add a second public review for one subject: only the review count grows.
   Hide or schedule it and verify the public review projection again.
5. Clear `EditorialRoot` on the local source widgets to inspect the preserved
   legacy mode, then restore the explicit references. Keep private pre-write
   snapshots for restoring native data and ACLs.

Record actual HTTP and browser results separately. Passing model tests does
not prove native permissions, schema installation or browser appearance.
