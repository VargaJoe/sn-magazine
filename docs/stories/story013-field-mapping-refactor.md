# Story 013: sensenet Content Type Field Mapping and Refactor Plan

## Background
The sn-magazine project uses sensenet ECM as a backend for dynamic layouts and widgets. Each layout and widget is a sensenet content item with a rich schema. However, only a subset of sensenet fields are currently mapped to the React/zustand codebase.

## Current Field Mapping

### Layouts
- **Mapped fields:**
  - `DisplayName` → Used for page titles and UI labels
  - `Description` → Used in some content displays
  - `Type` → Used for dynamic component resolution
  - `Id`, `Name`, `Path` → Used for identity and key generation
- **Not mapped (examples):**
  - `MetaTitle`, `MetaDescription`, `MetaRobots` (static or computed in partial-head.js)
  - `PageTemplate` (referenced in component/CSS names, not dynamic)
  - `Tags`, `Rate`, `WithLayout`, `Workspace`, etc.

### Widgets
- **Mapped fields:**
  - `DisplayName`, `Description`, `Type`, `Id`, `Name`, `Path` (as above)
  - `ClientComponent`, `PortletZone`, `ContentQuery`, `ContextBinding` (for dynamic resolution and config)
- **Not mapped (examples):**
  - `CacheKey` (present in schema, not used in code)
  - `Tags`, `Rate`, `Sharing`, etc.

## Proposed Refactor & Best Practices
- **Meta fields:** Map sensenet `MetaTitle`, `MetaDescription`, and `MetaRobots` to React Helmet or similar for dynamic SEO.
- **PageTemplate:** Already used for dynamic layout selection, but could be further documented and made more flexible for future layout types.
- **CacheKey:** Use `CacheKey` for widget/component memoization or caching where appropriate.
- **Tags/Sharing:** Consider exposing `Tags` and `Sharing` fields for filtering, search, or social features.
- **General:**
  - Document all field mappings in code and docs.
  - Use zustand for global state only for fields needed across components; keep local state/props for unique data.
  - Avoid over-globalizing state (e.g., do not store currentWidget globally if multiple widgets can be visible).
  - Prefer stable, unique keys for React components using sensenet identity + relevant settings (see getComponentKey).

## Advanced Page Structure Proposal

In a more advanced and maintainable solution (as seen in other projects), the concept of "layout" is split into three distinct layers:

1. **PageTemplate (was: Layout):**
   - Defines the HTML DOM structure for the page (e.g., header, sidebar, main, footer).
   - Can contain hardcoded widgets/components for static areas.
   - Is a sensenet content type (PageTemplate) and can be referenced by name or by content reference.
   - Should be renamed in code and docs from "Layout" to "PageTemplate" for clarity.

2. **Page:**
   - Represents the actual content page (e.g., Article, News, Home).
   - Has a reference to the PageTemplate it should use (currently by name, but could be a content reference for more flexibility).
   - Contains custom metadata (SEO fields) that can override defaults from context/PageTemplate.
   - Defines the main content and can have its own widget zones.

3. **Widgets:**
   - Added to either PageTemplate (for static/shared widgets) or Page (for page-specific widgets).
   - Each widget is a sensenet content item with fields for zone, visibility, title, component, context, content query, etc.
   - Widget zones determine where in the DOM (as defined by PageTemplate) the widget is rendered.
   - Widget context and content query define what data/content the widget displays.

### Migration/Refactor Plan
- Rename all code and documentation references from "Layout" to "PageTemplate" where appropriate.
- Refactor the codebase to:
  - Use PageTemplate for DOM structure and static widgets.
  - Use Page for content and dynamic widget zones.
  - Support referencing PageTemplate by content reference, not just by name.
  - Allow Page to override SEO/meta fields as needed.
  - Support widget assignment to both PageTemplate and Page, with clear zone mapping.
- Document the new structure and best practices.
- Audit for hardcoded widgets in PageTemplate and ensure they are handled consistently.
- Plan for backward compatibility or migration scripts if needed.

## Tasks
- [ ] Audit all layouts and widgets for sensenet field usage.
- [ ] Refactor to support dynamic meta fields (MetaTitle, MetaDescription, MetaRobots).
- [ ] Refactor to support dynamic PageTemplate selection.
- [ ] Evaluate and implement CacheKey usage for memoization/caching.
- [ ] Document all field mappings and best practices in docs/field-mapping.md.
- [ ] Update implementation-tasks.md and README.md with new best practices.

---
This story will ensure the codebase is fully aligned with sensenet ECM schemas and is maintainable, scalable, and SEO-friendly.
