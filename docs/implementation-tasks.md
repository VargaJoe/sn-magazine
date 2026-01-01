# Implementation Tasks

- sn-magazine is a React-based webapp for building dynamic, layout- and widget-driven websites using sensenet ECM as a backend.
- Supports predefined layouts, dynamic layouts and widgets from sensenet repository, and auto-resolves React components for content types.
- Modular structure: layouts, widgets, and content components.
- Uses zustand for global state management.
- Layout and widget resolution is highly dynamic, based on repository content and config.

## In Progress 
--no stories are in progress--


## Planned 
### Story 008: API Integration Refactor ([docs/stories/story008-api-integration.md](docs/stories/story008-api-integration.md))
  - [ ] Abstract sensenet API calls into a dedicated service layer
  - [ ] Add retry logic and user feedback for failed requests
  - [ ] Document API integration points and usage
### Story 009: Component Modularity and Type Safety ([docs/stories/story009-component-modularity.md](docs/stories/story009-component-modularity.md))
  - [ ] Review all widget/layout/content components for self-containment
  - [ ] Add prop-types or TypeScript for type safety
### Story 011: Test Coverage and Quality ([docs/stories/story011-testing.md](docs/stories/story011-testing.md))
  - [ ] Add unit tests for dynamic resolution logic
  - [ ] Add integration tests for API and component interactions
  - [ ] Review and improve test coverage for critical modules
### Story 012: Documentation Improvements ([docs/stories/story012-documentation.md](docs/stories/story012-documentation.md))
  - [ ] Add inline code documentation and comments for dynamic logic
  - [ ] Document custom hooks and utility functions
  - [ ] Improve README and developer onboarding docs
### Story 013: sensenet Content Type Field Mapping and Refactor Plan ([docs/stories/story013-field-mapping-refactor.md](docs/stories/story013-field-mapping-refactor.md))
  - [ ] Audit all layouts and widgets for sensenet field usage.
  - [ ] Refactor to support dynamic meta fields (MetaTitle, MetaDescription, MetaRobots).
  - [ ] Refactor to support dynamic PageTemplate selection.
  - [ ] Evaluate and implement CacheKey usage for memoization/caching.
  - [ ] Document all field mappings and best practices in docs/field-mapping.md.
  - [ ] Update implementation-tasks.md and README.md with new best practices.
### Story 014: Repository Restructure and Monorepo Migration ([docs/stories/story014-repository-restructure-monorepo.md](docs/stories/story014-repository-restructure-monorepo.md))
  - [ ] Merge all feature and site branches back to master for a clean starting point.
  - [ ] Retain the current production branch for uninterrupted live deployments.
  - [ ] Refactor master to contain only generic builder code (no site-specific widgets, layouts, or configs).
  - [ ] Set up a monorepo structure (e.g., using Yarn Workspaces or Lerna) with at least two packages:
      - `core-builder` (generic builder)
      - `site-project` (site-specific code, can be duplicated for each site)
  - [ ] Move site-specific code into its own package(s) within the monorepo.
  - [ ] Update documentation to reflect the new structure and workflow.
  - [ ] Test that both core and site packages build and run correctly.
  - [ ] Plan for future separation into independent repositories if needed.

## Completed 

### Story 001: Initial Dynamic Layout and Widget System ([docs/stories/story001-initial-dynamic-layout.md](docs/stories/story001-initial-dynamic-layout.md))
### Story 002: Global Store and Debug Info Consolidation ([docs/stories/story002-global-store-debug.md](docs/stories/story002-global-store-debug.md))
  - [x] Implement zustand global store for app state
  - [x] Refactor components to use global store
  - [x] Consolidate debug info and logging utilities
  - [x] Add debug info UI for development
  - [x] Document store usage and debug features
  - [x] Add state management best practices doc and reference from README
### Story 003: Authentication and Client Auth ([docs/stories/story003-auth-client.md](docs/stories/story003-auth-client.md))
### Story 004: Facebook Comments Widget and Social Features ([docs/stories/story004-facebook-comments.md](docs/stories/story004-facebook-comments.md))
### Story 005: Layout and Card Visual Improvements ([docs/stories/story005-layout-card-visuals.md](docs/stories/story005-layout-card-visuals.md))
### Story 006: Optimize Dynamic Component Resolution ([docs/stories/story006-dynamic-component-resolution.md](docs/stories/story006-dynamic-component-resolution.md))
  - [x] Centralized layout and widget resolution logic
  - [x] Added robust error handling and fallback for missing components
  - [x] Implemented caching for resolved components to avoid repeated dynamic imports
  - [x] Documented the resolution logic for maintainability (see docs/dynamic-component-resolution.md)
  - [x] Implemented cache invalidation for lazyComponents (for HMR/dev)
  - [x] Added unit tests for importView and addComponent
  - [x] Improved error reporting with more context
  - [x] Supported custom fallback components for missing imports
  - [x] Added developer documentation for dynamic resolution (inline and usage)
  - [x] Added clear cache button to debug info in dev mode
  - [x] Persisted debug info visibility using localStorage and URL param
  - [x] Added detailed debug logging to PageWrapper to track remounts, instance identity, layout key, and layout node path/id across navigations
  - [x] Fixed React lint errors and ensured stable hook dependencies in PageWrapper
  - [x] Added stable layout CSS (.main-content-stable, .sidebar-stable) and skeleton loader (.skeleton-loader) to public/App-Custom.css
  - [x] Wrapped dynamic content in a stable container and show skeleton loader when content is not present
  - [x] Confirmed visual stability and adjusted min-height/min-width as needed
  - [x] Fixed bug in page-wrapper.js: now always clears previous component before setting a new one and keys the main content wrapper on wrappercompo.key to force remounts, ensuring old components are removed on navigation. Added wrappercompo?.key to useCallback dependency array to fix React lint error.
  - [x] Refactored and stabilized getComponentKey logic for unique and stable React keys in dynamic components.
  - [x] All changes documented in implementation-tasks.md for traceability.
### Story 007: State Management Optimization ([docs/stories/story007-state-management.md](docs/stories/story007-state-management.md))
  - [x] Created feature branch 'feature/state-management-optimization' from 'develop/review-site' to proceed with state management optimization.
  - [x] Audit all widget/component usages of useSnStore and props to identify redundant props.
  - [x] Refactor widgets/components to remove redundant props (page/layout) in favor of zustand.
  - [x] Consider moving more widget/context state to zustand if it improves maintainability, but avoid over-globalizing state.
  - [x] Document best practices for store usage and component design.
  - [x] All Story 007 tasks complete. State management optimization is finalized and ready for PR/merge.

### Technical Tasks - Configurable Maintenance Template
  - [x] Created page-maintenance.js and page-maintenance-leisure.js layouts with full header, maintenance message, and footer
  - [x] Added maintenanceTemplate, maintenanceSiteName, maintenanceTitle, maintenanceText, maintenanceEmail options to config.json and corresponding REACT_APP_* environment variables
  - [x] Modified PageWrapper to render maintenance layout when API connection fails
  - [x] Set default maintenance template to "maintenance" if not configured
  - [x] Added centered layout styling (maxWidth 66.666%, margin 0 auto) to both maintenance templates
  - [x] Implemented HTML rendering for maintenanceText using dangerouslySetInnerHTML
  - [x] Added conditional email link rendering based on maintenanceEmail presence
  - [x] Updated README.md with documentation
  - [x] Verified build compiles without errors
### Maintenance Page for API Downtime
  - [x] Implemented maintenance page rendering in PageWrapper when repository connection fails
  - [x] Fixed PageWrapper return logic to render maintenance page even when context is null
  - [x] Used addComponent to dynamically load maintenance layouts
  - [x] Verified maintenance page displays correctly when API is unavailable
  - [x] Verified build compiles without errors

### Technical Tasks - Loading Ref Optimization in PageWrapper
  - [x] Added loadingRef = useRef(false) to prevent double loadPage calls
  - [x] Check if loadingRef.current is true at start of loadPage and return early if so
  - [x] Set loadingRef.current to true after the check
  - [x] Reset loadingRef.current to false in the finally block
  - [x] Build succeeded with warnings about unused variables, no errors
  - [x] App ready for testing to validate render count reduction
  - [x] Validated successful render count reduction: renders decreased from 45+ to 17 across navigation session, with "loadPage already in progress, skipping" log message confirming fix. Renders now primarily due to legitimate state changes, closer to 1-2 per navigation target, with remaining optimization for widget-level renders.
  - [x] Fixed navigation issue by resetting loadingRef.current = false at the beginning of loadContent, so each new location load resets the loading state and allows loadPage to execute properly. Navigation now works on first click.
  - [x] Replaced single loadingRef with loadingRefs Map for per-context loading states to prevent blocking new location loads while allowing concurrent loads for different contexts.
  - [x] Added React.memo to key widgets (nested-review-list-item, manual-list-banner, manual-list-news) to prevent unnecessary re-renders when props unchanged.
  - [x] Updated Zustand store to use createWithEqualityFn with shallow equality for efficient state updates.
  - [x] Further reduced renders to ~29 total across navigations, with deep change detection logs indicating remaining re-renders from unstable props (likely recreated arrays/objects).
  - [x] Committed and pushed changes to fix/double-reload-of-pages branch for live testing.
  - [x] Implemented global contextCache Map in context-binding.js to avoid redundant API calls for same contexts.
  - [x] Added loading checks in widgets (manual-list-news-half.js, manual-list-banner.js, manual-list-menu-logo.js, manual-list-news.js, manual-list-review.js) to defer rendering until bindedContext.loading is false, ensuring components render only once when all data is available.
  - [x] Implemented deep equality check in page-wrapper.js to prevent unnecessary widget state updates, avoiding re-renders when widget arrays are recreated but content unchanged.
  - [x] Build succeeded without errors, ready for live testing to validate further render reduction.
### Technical Tasks - ShowDebugInfo Component Fix and App Stability
  - [x] Fixed ShowDebugInfo component syntax error by converting from invalid class component with hooks to proper function component using useState and useEffect
  - [x] Fixed missing deepEqual import in manual-list-review.js
  - [x] Build now succeeds with only warnings, app loads without syntax errors
  - [x] Implemented stable element caching in page-leisure-simple.js using useRef(Map) to cache component elements by componentId, preventing remounts that cause hook count mismatches and 'Rendered fewer hooks than expected' errors
  - [x] Cleaned up unused imports and fixed JSX comment syntax in manual-list-news-half.js
  - [x] Build succeeded with only minor warnings in unrelated files, app ready for testing to validate stable renders and no hook errors
### Technical Tasks - Layout Memoization Optimization
  - [x] Added React.memo to all dynamic layout components (page-vanilla.js, page-wide.js, page-explore.js, page-mirror.js, page-double.js, page-error.js) to prevent unnecessary re-renders when props haven't changed
  - [x] Extended performance optimizations from page-leisure-simple.js to ensure consistent memoization across all layouts
  - [x] Build succeeded with only minor lint warnings about link accessibility, app ready for testing to validate reduced renders across all layouts
### Technical Tasks - Layout Element Caching Optimization
  - [x] Implemented element caching in all dynamic layout components (page-vanilla.js, page-wide.js, page-explore.js, page-mirror.js, page-double.js) using useRef(Map) to cache component elements by componentId, preventing remounts that cause hook count mismatches
  - [x] Replaced addComponentsByZone with individual addComponent calls for each widget, ensuring consistent performance across all layouts
  - [x] Build succeeded with only minor lint warnings, app ready for testing to validate stable renders and no hook errors in any layout
  
### Story 010: Performance Optimization ([docs/stories/story010-performance.md](docs/stories/story010-performance.md))
  - [x] Profile and optimize rendering of large content/widget trees
  - [x] Use React Suspense and lazy loading efficiently
  - [x] Optimize dynamic imports and caching
  - [x] Centralize element caching in CachedComponentsByZone React component for all dynamic layouts
### Story 015: Disqus Comments Widget and Configuration ([docs/stories/story015-disqus-comments.md](docs/stories/story015-disqus-comments.md))
  - [x] Implement DisqusCommentsWidget component with SDK loading and configuration
  - [x] Add disqusShortname configuration to config.json and environment variables
  - [x] Create Disqus setup guide documentation
  - [x] Refactor config to use environment variables instead of config.json requires
  - [x] Add .env.example with all required environment variables
  - [x] Test widget functionality and deploy previews
  - [x] Fixed bug where navigating away from a page with Disqus comments caused white screen and TypeError; improved cleanup to clear DOM and remove script on unmount, removed problematic reset call
