# Story 006: Optimize Dynamic Component Resolution

## Summary
- Centralize layout and widget resolution logic
- Add robust error handling and fallback for missing components
- Implement caching for resolved components to avoid repeated dynamic imports
- Document the resolution logic for maintainability (see docs/dynamic-component-resolution.md)
- Implement cache invalidation for lazyComponents (for HMR/dev)
- Add unit tests for importView and addComponent
- Improve error reporting with more context
- Support custom fallback components for missing imports
- Add developer documentation for dynamic resolution (inline and usage)
- Add clear cache button to debug info in dev mode
- Persist debug info visibility using localStorage and URL param
- Add detailed debug logging to PageWrapper to track remounts, instance identity, layout key, and layout node path/id across navigations
- Fix React lint errors and ensure stable hook dependencies in PageWrapper
- Add stable layout CSS (.main-content-stable, .sidebar-stable) and skeleton loader (.skeleton-loader) to public/App-Custom.css
- Wrap dynamic content in a stable container and show skeleton loader when content is not present
- Confirm visual stability and adjust min-height/min-width as needed
- Fix bug in page-wrapper.js: now always clears previous component before setting a new one and keys the main content wrapper on wrappercompo.key to force remounts, ensuring old components are removed on navigation. Added wrappercompo?.key to useCallback dependency array to fix React lint error.
- Refactor and stabilize getComponentKey logic for unique and stable React keys in dynamic components.
- All changes documented in implementation-tasks.md for traceability.

## Tasks (all completed)
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
