import React from 'react';

// --- Dynamic Component Resolution ---
// This array acts as a simple in-memory cache for lazy-loaded components.
const defaultComponent = 'default';
let lazyComponents = [];

/**
 * Clears the in-memory cache of lazy-loaded components.
 * Useful for HMR or manual cache invalidation during development.
 */
export function clearLazyComponentCache() {
  lazyComponents = [];
  if (process.env.NODE_ENV === 'development') {
    console.info('lazyComponents cache cleared');
  }
}

/**
 * Dynamically imports a React component based on type, prefix, and component name.
 * Uses a simple cache to avoid repeated imports.
 * Falls back to the default component or a custom fallback if import fails.
 * @param {string} type - The folder (e.g. 'layouts', 'widgets', 'content')
 * @param {string} prefix - The component prefix (e.g. 'auto', 'manual', 'page')
 * @param {string} component - The component name (without prefix)
 * @param {string} [fallback] - Optional custom fallback component name
 * @returns {React.LazyExoticComponent}
 */
function importView(type, prefix, component, fallback) {
  if (!type || !prefix || !component) {
    const msg = `importView: Missing type, prefix, or component: type=${type}, prefix=${prefix}, component=${component}`;
    console.error(msg);
    try {
      return require(`../${type}/auto-${fallback || defaultComponent}`).default;
    } catch (err) {
      console.error('Failed to require fallback component', err);
      return null;
    }
  }
  // Check cache first
  let lazyView = lazyComponents.find(ptmplt => ptmplt.type === type && ptmplt.prefix === prefix && ptmplt.component === component && ptmplt.fallback === fallback);
  if (!lazyView) {
    try {
      lazyView = {
        type,
        prefix,
        component,
        fallback,
        view: require(`../${type}/${prefix}-${component}`).default
      };
    } catch (err) {
      if (fallback) {
        const msg = `importView: Failed to require ../${type}/${prefix}-${component}, falling back to ${prefix}-${fallback}`;
        console.warn(msg, err);
        try {
          lazyView = {
            type,
            prefix,
            component,
            fallback,
            view: require(`../${type}/${prefix}-${fallback}`).default
          };
        } catch (err2) {
          console.error('Failed to require fallback', err2);
          return null;
        }
      } else {
        const msg = `importView: Failed to require ../${type}/${prefix}-${component}, falling back to auto-${defaultComponent}`;
        console.warn(msg, err);
        try {
          lazyView = {
            type,
            prefix,
            component,
            fallback,
            view: require(`../${type}/auto-${defaultComponent}`).default
          };
        } catch (err2) {
          console.error('Failed to require default', err2);
          return null;
        }
      }
    }
    lazyComponents.push(lazyView);
    if (process.env.NODE_ENV === 'development') {
      console.log('importView: new component added to cache:', lazyView);
    }
  }
  return lazyView.view;
}

/**
 * Adds a dynamically resolved component to the render tree.
 * @param {string} type
 * @param {string} prefix
 * @param {string} component
 * @param {string|number} id
 * @param {object} data
 * @param {object} page
 * @param {object} widget
 * @returns {JSX.Element}
 */
export const addComponent = (type, prefix, component, id, data, page, widget, fallback) => {
  const View = importView(type, prefix, component, fallback);
  // widgets can be top level or nested
  // top level widgets usually get context from store
  // nested widgets get context from parent widget
  return (
    <View key={id}
      data={data}
      // page={page}
      widget={widget} />
  );
};

export const CachedComponentsByZone = ({ type, zone, widgets, context }) => {
  const componentsRef = React.useRef(new Map());

  if (!widgets || widgets.length === 0) {
    console.log('cached component by zone - widgets undefined: ', {type: type}, {zone: zone}, {context: context});
    if (zone === null || zone === 'content') {
      return addComponent('content', 'auto', context.Type.toLowerCase(), `${type}-${zone}-err-${context.Id}`, null);
    } else {
      return null;
    }
  }

  // console.log('cached component by zone - widgets: ', type, zone, context, widgets);
  return (
    widgets.filter(pcnt => pcnt.PortletZone === zone).map((child) => { 
      const componentId = `${child.Id}`;
      if (!componentsRef.current.has(componentId)) {
        const isAuto = (child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '');
        const compoType = isAuto ? child.Type : child.ClientComponent;
        const prefix = (isAuto) ? "auto" : "manual";
        const element = addComponent(type, prefix, compoType.toLowerCase(), componentId, null, null, child);
        componentsRef.current.set(componentId, element);
      }
      return componentsRef.current.get(componentId);
    })
  );
};

export const addComponentsByZone = (type, zone, contextobs, page, widgets, context) => {
  return ShowComponentsByZone(type, zone, contextobs, page, widgets, context);
}

export const ShowComponentsByZone = (type, zone, contextobs, page, widgets, context) => {
  // if context is not present, use context from store, therefore it can not be a function 
  // const {context} = useSnStore((state) => state);

  if (!widgets || widgets.length === 0) {
    console.log('add component by zone - widgets undefined: ', {type: type}, {zone: zone}, {context: context}, {page: page});
    if (zone === null || zone === 'content') {
      return addComponent('content', 'auto', context.Type.toLowerCase(), `${type}-${zone}-err-${context.Id}`, null)
    } else {
      return null;
    }
  }

  console.log('add component by zone - widgets: ', type, zone, context, page, widgets);
  return (
    widgets.filter(pcnt => pcnt.PortletZone === zone).map((child) => { 
      const isAuto = (child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '');
      const compoType = isAuto ? child.Type : child.ClientComponent;
      const prefix = (isAuto) ? "auto" : "manual";
      const componentId = getComponentKey(child);
      console.log('[ShowComponentsByZone] type:', type, 'zone:', zone, 'component:', compoType, 'componentId:', componentId, 'child:', child);
      return addComponent(type, prefix, compoType.toLowerCase(), componentId, null, null, child);
    })
  );
};

export const addLayout = (contextAsWidget, setLayout) => {
  let layout = 'explore';

  const autoLayout = {
    "default": "wide",
    "folder": "explore",
    "content": "wide",
    "isFolder": "explore",
    "notFolder": "wide"
  };

  if (autoLayout[contextAsWidget.Type] !== undefined) {
    layout = autoLayout[contextAsWidget.Type];
  } else if (contextAsWidget.IsFolder && autoLayout.isFolder !== undefined) {
    layout = autoLayout.isFolder;
  } else if (!contextAsWidget.IsFolder && autoLayout.notFolder !== undefined) {
    layout = autoLayout.notFolder;
  }

  const componentId = getComponentKey(contextAsWidget);
  console.log('[addLayout] layout:', layout, 'componentId:', componentId, 'contextAsWidget:', contextAsWidget);
  setLayout(layout);
  return addComponent('layouts', 'page', layout, `page-${layout}`, contextAsWidget);
};

/**
 * Generates a stable, unique key for a component based on its identity and relevant settings.
 * @param {object} component - The component object
 * @returns {string} - The unique key
 */
function getComponentKey(component) {
  if (!component) return '';
  return `${component.Id}`;
}

// --- End Dynamic Component Resolution ---
export { importView };

