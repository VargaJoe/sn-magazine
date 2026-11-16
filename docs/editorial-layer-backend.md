# Optional editorial backend (local pilot)

The editorial v0.2 layer adds three `GenericContent` CTDs: `EditorialItem`,
`EditorialCollection`, and `EditorialMembership`. `EditorialAnnotation` remains
a `Folder` with every legacy field preserved and optional multi-reference
`Items`. `WidgetMagazineSource.EditorialRoot` is an optional single `Folder`
reference. Empty configuration keeps the legacy reader path.

The same Source widget owns the optional browse and recommendation settings;
these add no article schema or content type. Existing destination, branding,
category and news roles remain available.

The extension has no MediaItem, BookMediaItem, Timeline, external project,
site-name, publisher-name, or article-CTD dependency.

## Build and local installation

From this checkout:

```powershell
./deploy/local/build-editorial-extension.ps1
```

The .NET 8 assembly is written to
`deploy/local/runtime/editorial-extension/publish/SnMagazine.Editorial.dll`.
NuGet packages, HTTP cache, restore metadata and build outputs stay below the
ignored `deploy/local/runtime/` directory. Package versions match the pinned
repository image: ContentRepository and Storage `7.8.2-alpha.6`, Security `4.3.1`.
The script only builds; it never restarts, imports into, or deploys a repository.

Install the DLL in the existing local repository's `/app` before updating the
CTDs. Restart that same repository process so handler discovery sees the new
assembly. As a native Administrator, POST an empty JSON object to
`/odata.svc/('Root')/InstallEditorialSchema`. This fixed operation embeds exactly
the five module CTDs and invokes native `ContentTypeInstaller`; it accepts no
arbitrary XML, path, handler or target argument. Native installation preserves
the PascalCase schema names and existing CTD node IDs even when content naming
lowercases ordinary uploaded names. No temporary global ContentNaming setting
is needed. A failed batch can leave earlier CTDs installed; inspect the saved
receipt/readback and reconcile with the same definitions rather than assume
an all-or-nothing batch.
An operator should preserve the existing Compose project, credentials, native
naming image and TLS setup. No replacement repository is needed.

Copying into a running container survives that container's restart, but not
container recreation. Before recreating an installed repository, build the DLL
and add `deploy/local/editorial.compose.yml` to the **existing stack's** base
Compose/environment files. Set `SN_MAGAZINE_EDITORIAL_DLL` to the absolute DLL
path. This opt-in overlay only mounts that assembly; it does not replace the
image, authentication, ports or volumes. Do not remove the assembly while
installed CTDs still reference its handlers. Clearing EditorialRoot rolls back
the reader configuration; it does not uninstall the server extension.

## Storage and save contract

Each site root is a native `Workspace`. Configure `EditorialRoot` as one plain
`Folder` immediately below that Workspace, for example
`<site>/(editorial)/`. Store records in folders below it, such as `items`,
`collections`, `memberships`, and `annotations`. No absolute site path appears
in the module. The reader is responsible for selecting its configured root;
the backend ensures related module records share the same direct-child
editorial container and nearest Workspace.

Native `Folder` types inherit their effective AllowedChildTypes from the site
Workspace; a Folder-local list cannot override that transitive behavior. For
an opt-in site, append the three new CTD names and `EditorialAnnotation` to
that **Workspace instance's** AllowedChildTypes while preserving all existing
entries. Save the exact prior list for rollback. Do not edit the shared
Workspace CTD or another site's whitelist. Native type availability still
requires the editor's normal permissions on the CTDs.

Legacy annotation records may stay elsewhere within that same Workspace;
their `Target` and every optional `Items` reference must remain in that site.
All linked annotation items must share one editorial container. Source widgets
reject an EditorialRoot belonging to another site, a nested root, or a
non-Folder root. The backend does not search all source widgets to enforce
one configured root globally.

### Source browse and recommendation settings

| Native field | Type and allowed values | Default |
| --- | --- | --- |
| `DefaultBrowseView` | Single Choice: `publication`, `collections` | `publication` |
| `CollectionRoots` | Multiple Reference: same-Workspace `Folder` or a derived type | Empty |
| `RecommendationMode` | Single Choice: `collections-and-tags`, `tags`, `none` | `collections-and-tags` |
| `RecommendationCount` | Integer from 0 through 12 | 4 |
| `RecommendationCollectionWeight` | Integer from 0 through 10 | 2 |
| `RecommendationTagWeight` | Integer from 0 through 10 | 1 |

`CollectionRoots` selects additional public navigation directories. Unlike
`EditorialRoot`, these may be nested and may have a Folder-derived type; they
do not have to sit directly below the Workspace. Every stored target must
exist, be live, have the required type and share the Source widget's nearest
Workspace. Incoming targets must also be Open-readable to the original caller;
multiple distinct references are supported by the native field. Configuring a
directory does not grant public access to it or its children. The reader must
project canonical public content and apply its normal visibility checks.

Both Choice fields disallow extra values and multiple selections. Native Node
storage contains their string value; OData exposes the Choice field as a string
array, for example `DefaultBrowseView: ["publication"]`. Send a one-element
array when updating through OData. The reader may tolerate an absent setting
or a legacy scalar while normalizing the native response.
Their schema fields remain optional so an older Source can pass native field
validation before the save handler fills its defaults.

The CTD defines the creation defaults. The Source save handler fills empty
Choice values, has a defensive null-integer fallback, and checks the Choice
allowlists and integer ranges. The handler does not resave existing Source
widgets during schema installation. Existing nodes can project newly added
Choice fields as `[]` and integer fields as `0`; initialize their settings
explicitly when opting in. Stock OData converts numeric JSON `null` to `0`
before the handler runs; it is not a request to reset the creation default.
Send `4`, `2` and `1` explicitly to restore the count and weight defaults.
Explicit numeric zero remains zero: zero count hides recommendations and zero
weight disables that signal.
Recommendation ranking and its reader-facing explanation use these generic
settings; this backend does not derive routes from names or content IDs.

The existing `WidgetMagazineSource.Content` metadata still attaches
`WidgetMagazineSource.xml`. `InstallEditorialSchema` embeds that XML from the
build input, so rebuilding the DLL updates the native installer definition
without adding an installation operation or a new CTD.

Server saves reject:

- Empty Item/Collection titles and unsupported required choice values.
- An Item parent that is not a same-root `work` referenced by an `edition`.
- Parent self-links, cycles and cross-site/root module references.
- Cross-site collection HubPage, annotation Target or annotation Items.
- Missing, deleted, wrong-type or multiple stored single-reference targets.
- Negative Position; zero is unknown. Duplicate positions are retained for
  explicit reader/editor conflict reporting.
- An active duplicate Item+Collection membership or duplicate annotation
  Target within a Workspace, and duplicate incoming annotation item IDs.
- Cross-Workspace, wrong-type, missing or duplicate `CollectionRoots` targets;
  unsupported Source choices and out-of-range recommendation count or weights.

Uniqueness uses native SQL `QueryNodesByReferenceAndTypeAsync`, which reads
the current `LastMinorVersionId` reference rows. It does not use a search index
or pick a first match. An in-process semaphore encloses validation and the
native save/commit, so concurrent requests in this **single repository
process** cannot both pass the check. Multiple repository processes would
need a database-level/distributed uniqueness mechanism before deployment.
Native Save keeps the original caller and its AddNew/Save/version checks.
Internal inspection is elevated only to see authoritative metadata, while
permission decisions always use the original caller.

The public Membership field remains `Item` in forms, OData and CQL. It binds to
native storage property `EditorialItemReference` to avoid the CLR `Node.Item`
indexer-name collision in native field-slot reflection. Native SQL backref
validation uses that storage name; this does not introduce a new public field.

**Observed stock OData input normalization:** before calling a content handler,
`ODataMiddleware.UpdateFieldsAsync` loads reference IDs, discards missing or
unreadable entries, and for `AllowMultiple=false` passes only
`nodes.FirstOrDefault()` to the field. A raw JSON array with multiple IDs is
therefore accepted with one surviving reference; discarded IDs cannot be
validated by this handler. Stored single-reference cardinality and the selected
reference's type/site/root constraints are enforced. Native forms use a single
picker. Raw multi-ID request rejection is an explicit local prototype gap;
this slice does not patch the foreign OData assembly or add host middleware.

Direct move/copy operations on editorial records are blocked because they
can bypass relation validation or duplicate annotations/memberships. Ancestor
container moves and arbitrary database changes are outside this local
save-handler boundary; avoid moving an editorial root between Workspaces.
Reader projections additionally check relationship scopes.

## Read contract and privacy boundary

`IsListed` expresses editorial intent; native Open/OpenMinor rights still
apply. OnLoaded and every field GetProperty evaluate the original caller,
including cache hits and Id-only field projections. A caller with Save on a
record may inspect its unlisted state, subject to native Open/OpenMinor.
Other callers can read an Item or Collection only when IsListed is true.
A Membership is readable only when both linked endpoints are readable.

An annotation with an unreadable, Hidden, future-PublishDate or out-of-lifespan
Target is unavailable as an entire row to a reader without Save. This prevents
its Target or Items fields from advertising a hidden review. Old category
annotation targets without PublishDate continue to work. Optional reference
projections filter unreadable/unlisted targets, so a review mentioning one
listed and one unlisted item only returns the listed item. ParentItem and
ParentCollection projections likewise omit invisible parents. A missing
projected parent is not evidence of a bibliographic root.

Reference filtering never mutates stored relations. Reference index fields
use raw native IDs so caller-specific projections cannot rewrite the index.
`Source` and all bibliographic labels are publicly readable metadata when the
record is listed; private editorial notes must never be stored in them.

Native search **count-only** requests can execute without loading a content
handler. Therefore successful saves also add local-only native
`Visitor` (the anonymous user) denials for See, Preview, Open and OpenMinor on
nonpublic module records. Unlisting an Item or Collection applies the same
guard to its existing membership backrefs. These changes add restrictions
only: they do not break inheritance, remove or replace any existing ACE, deny
Everyone, or change the article nodes. Editor and signed-user rights remain
untouched. Original-caller field guards still protect signed readers.

This ACL guard is deliberately **monotonic**. Listing a previously guarded row
does not clear arbitrary existing/custom denials. After reviewing its content,
the owner must explicitly release the row's Visitor restrictions if they want
it public. That is a separate native ACL action, not an automatic IsListed
side effect. Initially listed new records retain their inherited native ACL.
Rows existing before the extension are not silently migrated or resaved.

The content database commit and security ACL update are separate operations;
the guard completes before a successful HTTP save returns, and client
cancellation after content commit does not skip it. This is not a claim of a
cross-store atomic creation transaction. A later article Target publication,
ACL or lifespan change does not invoke an annotation save handler. Resave the
affected annotation to apply its updated anonymous-count guard. A registered
host observer or a dedicated query boundary is required for continuous
lifecycle/count noninterference; plain DLL loading does not register that
observer. Mixed public/private annotation Items are field-filtered, while raw
reference index IDs remain available to native query evaluation. Derive reader
counts only from canonical visible rows and public review IDs. Do not infer
full arbitrary-CQL count protection from field projection tests.

## Required runtime verification

Build success proves API compatibility with the pinned packages. Run actual
authenticated HTTP tests against the existing local repository after loading
the DLL and CTDs:

1. Create valid same-site work/edition, hub/child collection, unknown-position
   and known-position memberships; add multiple Items to a review annotation.
2. Reject wrong-type endpoints, negative positions, edition-to-edition
   parents, self/cycles, cross-root/cross-Workspace links and duplicate Items.
   Separately verify and report native multi-ID single-reference normalization;
   do not label that case a rejected request.
3. Send two concurrent duplicate membership creates and duplicate annotation
   creates: one succeeds, the other fails. Repeat as updates and immediately
   after a previous save, without waiting for indexing.
4. As an editor, inspect unlisted records. As anonymous, deny direct Item and
   Collection reads, including `$select=Id` and after cache warm-up; deny a
   Membership whose item or collection is unlisted. Verify count-only queries
   return zero for guarded rows, including Target-filtered private annotation
   queries; verify existing editor/custom ACEs are preserved.
5. Ensure mixed listed/unlisted annotation Items return only listed items;
   deny hidden/future review annotation rows and expanded Target content.
6. Check annotation colour/legacy fields, source widgets without EditorialRoot,
   and the existing magazine independently of the opt-in layer.
7. Save a Source with several same-site nested Folder-derived CollectionRoots;
   confirm all references survive an expanded readback. Reject another
   Workspace's directory and a non-Folder target. With a restricted editor,
   confirm incoming references still require that caller's Open permission.
8. Check both allowed browse choices and all three recommendation modes; reject
   unsupported or multiple Choice values. Verify counts 0 and 12 and weights
   0 and 10 survive unchanged; reject values below 0 or above their maxima.
   Check defaults on creation, empty Choice fallback, and native numeric
   null-to-zero normalization. Initialize existing Source settings explicitly
   and ensure existing native role references and ACLs are preserved.

Runtime results belong to the local integration evidence; this document does
not claim they have passed merely because the extension compiled.
