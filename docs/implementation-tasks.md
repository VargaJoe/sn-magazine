# Implementation Tasks

## Codebase Analysis (2025-06-27)
- sn-magazine is a React-based webapp for building dynamic, layout- and widget-driven websites using sensenet ECM as a backend.
- Supports predefined layouts, dynamic layouts and widgets from sensenet repository, and auto-resolves React components for content types.
- Modular structure: layouts, widgets, and content components.
- Uses zustand for global state management.
- Layout and widget resolution is highly dynamic, based on repository content and config.

## Completed Stories
- _No completed stories yet_
- 2025-06-28: Updated App-Custom.css to match previous classic wide layout. Set .w3-content-custom max-width to 1400px, adjusted .layout-left and .layout-middle for better scaling, and cleaned up redundant rules for improved large-screen experience.
- 2025-06-28: Updated App-Custom.css for mobile: cards in .news-cards and .gallery-item now stack vertically (one per row) on small screens for better mobile usability.
- 2025-06-28: Improved mobile card layout: images are now centered and enlarged (70-80% width), and card content stacks vertically below the image for better mobile UX.
- 2024-06-09: Increased mobile font size for .news-item and .gallery-item. Ensured images in .news-item and .gallery-item are centered, 90vw wide, and always above text on mobile. All text/content now stacks below images and is centered for mobile.
- 2024-06-09: Updated mobile CSS so .gallery-item and .news-item expand to full viewport width (100vw), ensuring cards and images are truly large and centered on mobile.
- 2024-06-09: Unified .gallery-item and .news-item card style on mobile: added background, border-radius, box-shadow, and consistent margin/padding for visually pleasing cards.
- 2024-06-09: Updated .gallery-item cards on mobile to match .news-item style: consistent margin, padding, background, border-radius, and box-shadow.
- 2024-06-09: Increased top and side padding for .gallery-item on mobile, and added more space above/below image and text, to match .news-item card inner spacing.
- 2024-06-09: Consolidated and enforced mobile .gallery-item style: full width, consistent margin, strong inner padding, and spacing for image/text. Removed conflicts and ensured all properties use !important for mobile.

## In Progress Stories
- **Story 01: Optimize Dynamic Component Resolution** ([docs/stories/story01-dynamic-component-resolution.md](docs/stories/story01-dynamic-component-resolution.md))
  - [x] Centralize layout and widget resolution logic
  - [x] Add robust error handling and fallback for missing components
  - [x] Implement caching for resolved components to avoid repeated dynamic imports
  - [x] Document the resolution logic for maintainability (see docs/dynamic-component-resolution.md)
  - [x] Implement cache invalidation for lazyComponents (for HMR/dev)
  - [x] Add unit tests for importView and addComponent
  - [x] Improve error reporting with more context
  - [x] Support custom fallback components for missing imports
  - [x] Add developer documentation for dynamic resolution (inline and usage)
  - [x] Add clear cache button to debug info in dev mode
  - [x] Persist debug info visibility using localStorage and URL param
  - [x] Add detailed debug logging to PageWrapper to track remounts, instance identity, layout key, and layout node path/id across navigations
  - [x] Fix React lint errors and ensure stable hook dependencies in PageWrapper
  - [x] Add stable layout CSS (.main-content-stable, .sidebar-stable) and skeleton loader (.skeleton-loader) to public/App-Custom.css
  - [x] Wrap dynamic content in a stable container and show skeleton loader when content is not present
  - [x] Confirm visual stability and adjust min-height/min-width as needed
  - [x] Fixed bug in page-wrapper.js: now always clears previous component before setting a new one and keys the main content wrapper on wrappercompo.key to force remounts, ensuring old components are removed on navigation. Added wrappercompo?.key to useCallback dependency array to fix React lint error.

## Planned or Future Stories
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
