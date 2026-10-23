# State Management Best Practices (zustand)

This document describes best practices for state management in the sn-magazine project, focusing on the use of zustand for global and local state.

## What Belongs in zustand (Global State)
- **context**: The current sensenet context (content node) for the page.
- **page**: The current page content (if different from context).
- **layout**: The current layout/page template in use.
- **widgets**: The list of widgets for the current page/layout.
- **wrappercompo**: The current layout React component.
- **Setter functions**: `setContext`, `setPage`, `setLayout`, `setWidgets`, `setCompo`.

These are needed globally for navigation, layout/widget resolution, and cross-component communication.

## What Should Remain as Props or Local State
- **Widget configuration**: Always pass `widget` as a prop to widgets, since each instance may have different config.
- **Unique/local data**: Any data that is only relevant to a single component/widget instance (e.g., UI toggles, local form state, temporary values).

## What NOT to Put in zustand
- **Per-widget state**: Do not store state that is unique to a widget instance (e.g., open/close, local input values) in zustand.
- **Current widget**: Do not store a single `currentWidget` globally, since multiple widgets can be visible at once.

## How to Use zustand Effectively
- Use selectors in `useSnStore` (e.g., `useSnStore(state => state.context)`) to avoid unnecessary re-renders.
- Only put state in zustand if it is needed by multiple, unrelated components or for navigation/routing.
- Keep widget/component-local state in React `useState` or as props.

## Example: Correct Usage
```js
// Accessing global state
const { context, layout, widgets } = useSnStore((state) => ({
  context: state.context,
  layout: state.layout,
  widgets: state.widgets
}));

// Passing widget config as prop
<SomeWidget widget={widgetConfig} />
```

## Example: Incorrect Usage
```js
// Don't do this:
const { currentWidget } = useSnStore(); // Not needed, can cause bugs
```

## Summary
- Use zustand for global, cross-cutting state only.
- Pass widget config and unique data as props.
- Keep per-widget state local.
- Document all global state and its usage.

---
For more details, see the code comments in `src/components/store/sn-store.js` and the documentation in the README.
