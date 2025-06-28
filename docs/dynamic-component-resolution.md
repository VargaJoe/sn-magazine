# Dynamic Component Resolution in sn-magazine

This document explains the architecture, workflow, and best practices for the dynamic component resolution system in the sn-magazine project.

## Overview

sn-magazine uses a dynamic, modular approach to resolve and render layouts, widgets, and content components at runtime. This enables flexible page building and easy extension of the system with new components, without hardcoding imports or dependencies.

## Key Concepts

- **Dynamic Import:** Components are loaded on demand using React.lazy and dynamic import statements, based on type, prefix, and component name.
- **Caching:** An in-memory cache avoids repeated imports of the same component, improving performance.
- **Fallbacks:** If a component cannot be loaded, a default or custom fallback is rendered, ensuring robust error handling.
- **Developer Tools:** In development, a cache clear button and debug info panel are available for troubleshooting.

## Main Functions

- `importView(type, prefix, component, fallback)`: Dynamically imports a component, with error handling and caching.
- `addComponent(type, prefix, component, id, data, page, widget, fallback)`: Adds a resolved component to the render tree.
- `clearLazyComponentCache()`: Clears the in-memory cache (dev only).

## Workflow

1. **Component Request:** When a layout, widget, or content component is needed, `addComponent` is called with the appropriate parameters.
2. **Cache Check:** `importView` checks if the component is already cached. If so, it returns the cached version.
3. **Dynamic Import:** If not cached, the component is imported using a dynamic import statement. If the import fails, a fallback is loaded.
4. **Render:** The resolved component is rendered with the provided props.
5. **Cache Invalidation:** In development, the cache can be cleared manually or via HMR.

## Error Handling

- All dynamic imports are wrapped in try/catch logic. If a component fails to load, a warning is logged and a fallback is rendered.
- Missing or invalid parameters are handled gracefully, with clear error messages in development.

## Best Practices

- Use clear, consistent naming for components (e.g., `auto-`, `manual-`, `page-` prefixes).
- Keep components self-contained and modular.
- Use the debug info panel in development to inspect cache state and clear the cache if needed.
- Only use Yarn for dependency management (no package-lock.json).

## References
- See `src/components/utils/add-component.js` for implementation details.
- See `src/components/page-wrapper.js` for usage in page rendering.
- See `add-component.test.js` for unit tests.

---
_Last updated: 2025-06-28_
