# Implementation Tasks

## Codebase Analysis (2025-06-27)
- sn-magazine is a React-based webapp for building dynamic, layout- and widget-driven websites using sensenet ECM as a backend.
- Supports predefined layouts, dynamic layouts and widgets from sensenet repository, and auto-resolves React components for content types.
- Modular structure: layouts, widgets, and content components.
- Uses zustand for global state management.
- Layout and widget resolution is highly dynamic, based on repository content and config.

## Completed Stories
- **Story 01: Optimize Dynamic Component Resolution** ([docs/stories/story01-dynamic-component-resolution.md](docs/stories/story01-dynamic-component-resolution.md))
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

## In Progress Stories
- **Story 02: State Management Optimization** ([docs/stories/story02-state-management.md](docs/stories/story02-state-management.md))
  - [ ] Review zustand store structure for unnecessary re-renders
  - [ ] Split store if state becomes too coupled or large
  - [ ] Add documentation for store usage and best practices
- **Story 03: API Integration Refactor** ([docs/stories/story03-api-integration.md](docs/stories/story03-api-integration.md))
  - [ ] Abstract sensenet API calls into a dedicated service layer
  - [ ] Add retry logic and user feedback for failed requests
  - [ ] Document API integration points and usage
- **Story 04: Component Modularity and Type Safety** ([docs/stories/story04-component-modularity.md](docs/stories/story04-component-modularity.md))
  - [ ] Review all widget/layout/content components for self-containment
  - [ ] Add prop-types or TypeScript for type safety
  - [ ] Refactor components to reduce prop drilling and improve maintainability
- **Story 05: Performance Optimization** ([docs/stories/story05-performance.md](docs/stories/story05-performance.md))
  - [ ] Profile and optimize rendering of large content/widget trees
  - [ ] Use React Suspense and lazy loading efficiently
  - [ ] Optimize dynamic imports and caching
- **Story 06: Test Coverage and Quality** ([docs/stories/story06-testing.md](docs/stories/story06-testing.md))
  - [ ] Add unit tests for dynamic resolution logic
  - [ ] Add integration tests for API and component interactions
  - [ ] Review and improve test coverage for critical modules
- **Story 07: Documentation Improvements** ([docs/stories/story07-documentation.md](docs/stories/story07-documentation.md))
  - [ ] Add inline code documentation and comments for dynamic logic
  - [ ] Document custom hooks and utility functions
  - [ ] Improve README and developer onboarding docs

## Next Steps
- [ ] Add more detailed analysis of each module (layouts, widgets, content, utils)
- [ ] Document dynamic resolution logic for layouts/widgets
- [ ] Review and document API integration points
- [ ] List current features and missing features
- [ ] Add test coverage overview
