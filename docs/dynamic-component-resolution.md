# Dynamic Component Resolution in sn-magazine

This document explains the architecture, workflow, and best practices for the dynamic component resolution system in the sn-magazine project.

## Overview

sn-magazine uses a dynamic, modular approach to resolve and render layouts, widgets, and content components at runtime. This enables flexible page building and easy extension of the system with new components, without hardcoding imports or dependencies.

## Key Concepts

- **Dynamic Import:** Components are loaded on demand using React.lazy and dynamic import statements, based on type, prefix, and component name.
- **Element Caching:** React components are cached using useRef(Map) to prevent unnecessary re-renders and hook mismatches in widget-heavy layouts.
- **Zone-based Rendering:** Widgets are filtered and rendered by PortletZone (side, content, right) using the CachedComponentsByZone component.
- **Fallbacks:** If a component cannot be loaded, a default or custom fallback is rendered, ensuring robust error handling.
- **Developer Tools:** In development, a cache clear button and debug info panel are available for troubleshooting.

## Main Functions and Components

- `importView(type, prefix, component, fallback)`: Dynamically imports a component, with error handling and caching.
- `addComponent(type, prefix, component, id, data, page, widget, fallback)`: Adds a resolved component to the render tree.
- `CachedComponentsByZone`: React component that centralizes element caching for widgets by zone, preventing remounts and hook issues.
- `clearLazyComponentCache()`: Clears the in-memory cache (dev only).

## Workflow

1. **Component Request:** When a layout needs to render widgets, it uses `<CachedComponentsByZone type="widgets" zone="content" widgets={widgets} context={context} />`.
2. **Zone Filtering:** CachedComponentsByZone filters widgets by the specified PortletZone.
3. **Cache Check:** For each widget, checks if the component is already cached in useRef(Map). If cached, returns the cached element.
4. **Dynamic Resolution:** If not cached, calls `addComponent` to resolve the component dynamically using importView.
5. **Element Caching:** Stores the resolved React element in the Map to prevent future re-renders and hook mismatches.
6. **Render:** Returns an array of cached React elements for the zone.

## Error Handling

- All dynamic imports are wrapped in try/catch logic. If a component fails to load, a warning is logged and a fallback is rendered.
- Missing or invalid parameters are handled gracefully, with clear error messages in development.
- CachedComponentsByZone handles empty widget arrays and missing context gracefully.

## Best Practices

- Use clear, consistent naming for components (e.g., `auto-`, `manual-`, `page-` prefixes).
- Keep components self-contained and modular.
- Use CachedComponentsByZone in all dynamic layouts instead of manual caching logic.
- Use the debug info panel in development to inspect cache state and clear the cache if needed.
- Only use Yarn for dependency management (no package-lock.json).

## Performance Optimizations

- **Element Caching:** Prevents React component remounts by caching resolved elements in useRef(Map).
- **Zone-based Filtering:** Only processes widgets for the relevant zone, reducing unnecessary work.
- **Memoization:** CachedComponentsByZone uses React best practices for stable references.
- **Centralized Logic:** Eliminates code duplication across layout components.

## References
- See `src/components/utils/add-component.js` for CachedComponentsByZone implementation.
- See `src/components/page-wrapper.js` for usage in page rendering.
- See `src/components/layouts/` for examples of CachedComponentsByZone usage.
- See `add-component.test.js` for unit tests.

---
_Last updated: 2025-12-25_
