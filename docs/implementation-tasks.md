# Implementation Tasks

## Codebase Analysis (2025-06-27)
- sn-magazine is a React-based webapp for building dynamic, layout- and widget-driven websites using sensenet ECM as a backend.
- Supports predefined layouts, dynamic layouts and widgets from sensenet repository, and auto-resolves React components for content types.
- Modular structure: layouts, widgets, and content components.
- Uses zustand for global state management.
- Layout and widget resolution is highly dynamic, based on repository content and config.

## Completed Stories
- **Story 001: Initial Dynamic Layout and Widget System** ([docs/stories/story001-initial-dynamic-layout.md](docs/stories/story001-initial-dynamic-layout.md))
- **Story 002: Global Store and Debug Info Consolidation** ([docs/stories/story002-global-store-debug.md](docs/stories/story002-global-store-debug.md))
  - [x] Implement zustand global store for app state
  - [x] Refactor components to use global store
  - [x] Consolidate debug info and logging utilities
  - [x] Add debug info UI for development
  - [x] Document store usage and debug features
  - [x] Add state management best practices doc and reference from README
- **Story 003: Authentication and Client Auth** ([docs/stories/story003-auth-client.md](docs/stories/story003-auth-client.md))
- **Story 004: Facebook Comments Widget and Social Features** ([docs/stories/story004-facebook-comments.md](docs/stories/story004-facebook-comments.md))
- **Story 005: Layout and Card Visual Improvements** ([docs/stories/story005-layout-card-visuals.md](docs/stories/story005-layout-card-visuals.md))
- **Story 006: Optimize Dynamic Component Resolution** ([docs/stories/story006-dynamic-component-resolution.md](docs/stories/story006-dynamic-component-resolution.md))
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
- **Story 007: State Management Optimization** ([docs/stories/story007-state-management.md](docs/stories/story007-state-management.md))
  - [x] Created feature branch 'feature/state-management-optimization' from 'develop/review-site' to proceed with state management optimization.
  - [x] Audit all widget/component usages of useSnStore and props to identify redundant props.
  - [x] Refactor widgets/components to remove redundant props (page/layout) in favor of zustand.
  - [x] Consider moving more widget/context state to zustand if it improves maintainability, but avoid over-globalizing state.
  - [x] Document best practices for store usage and component design.
  - [x] All Story 007 tasks complete. State management optimization is finalized and ready for PR/merge.

## In Progress Stories
- **Story 008: API Integration Refactor** ([docs/stories/story008-api-integration.md](docs/stories/story008-api-integration.md))
  - [ ] Abstract sensenet API calls into a dedicated service layer
  - [ ] Add retry logic and user feedback for failed requests
  - [ ] Document API integration points and usage
- **Story 009: Component Modularity and Type Safety** ([docs/stories/story009-component-modularity.md](docs/stories/story009-component-modularity.md))
  - [ ] Review all widget/layout/content components for self-containment
  - [ ] Add prop-types or TypeScript for type safety
  - [ ] Refactor components to reduce prop drilling and improve maintainability
- **Story 010: Performance Optimization** ([docs/stories/story010-performance.md](docs/stories/story010-performance.md))
  - [ ] Profile and optimize rendering of large content/widget trees
  - [ ] Use React Suspense and lazy loading efficiently
  - [ ] Optimize dynamic imports and caching
- **Story 011: Test Coverage and Quality** ([docs/stories/story011-testing.md](docs/stories/story011-testing.md))
  - [ ] Add unit tests for dynamic resolution logic
  - [ ] Add integration tests for API and component interactions
  - [ ] Review and improve test coverage for critical modules
- **Story 012: Documentation Improvements** ([docs/stories/story012-documentation.md](docs/stories/story012-documentation.md))
  - [ ] Add inline code documentation and comments for dynamic logic
  - [ ] Document custom hooks and utility functions
  - [ ] Improve README and developer onboarding docs
- **Story 013: sensenet Content Type Field Mapping and Refactor Plan** ([docs/stories/story013-field-mapping-refactor.md](docs/stories/story013-field-mapping-refactor.md))
  - [ ] Audit all layouts and widgets for sensenet field usage.
  - [ ] Refactor to support dynamic meta fields (MetaTitle, MetaDescription, MetaRobots).
  - [ ] Refactor to support dynamic PageTemplate selection.
  - [ ] Evaluate and implement CacheKey usage for memoization/caching.
  - [ ] Document all field mappings and best practices in docs/field-mapping.md.
  - [ ] Update implementation-tasks.md and README.md with new best practices.

## Next Steps
- [ ] Add more detailed analysis of each module (layouts, widgets, content, utils)
- [ ] Document dynamic resolution logic for layouts/widgets
- [ ] Review and document API integration points
- [ ] List current features and missing features
- [ ] Add test coverage overview
