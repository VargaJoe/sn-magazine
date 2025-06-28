import React, { lazy } from 'react';
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');

// --- Dynamic Component Resolution ---
// This array acts as a simple in-memory cache for lazy-loaded components.
const defaultComponent = 'default';
let lazyComponents = [];

/**
 * Dynamically imports a React component based on type, prefix, and component name.
 * Uses a simple cache to avoid repeated imports.
 * Falls back to the default component if import fails.
 * @param {string} type - The folder (e.g. 'layouts', 'widgets', 'content')
 * @param {string} prefix - The component prefix (e.g. 'auto', 'manual', 'page')
 * @param {string} component - The component name (without prefix)
 * @returns {React.LazyExoticComponent}
 */
function importView(type, prefix, component) {
  if (!type || !prefix || !component) {
    console.error('importView: Missing type, prefix, or component', { type, prefix, component });
    return lazy(() => import(`../${type}/auto-${defaultComponent}`));
  }
  // Check cache first
  let lazyView = lazyComponents.find(ptmplt => ptmplt.type === type && ptmplt.prefix === prefix && ptmplt.component === component);
  if (!lazyView) {
    lazyView = {
      type,
      prefix,
      component,
      view: lazy(() =>
        import(`../${type}/${prefix}-${component}`)
          .catch((err) => {
            console.warn(`importView: Failed to import ../${type}/${prefix}-${component}, falling back to auto-${defaultComponent}`, err);
            return import(`../${type}/auto-${defaultComponent}`);
          })
      )
    };
    lazyComponents.push(lazyView);
    console.log('importView: new component added to cache:', lazyView);
  } else {
    // Already cached
    // console.log('importView: using cached component:', lazyView);
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
export const addComponent = (type, prefix, component, id, data, page, widget) => {
  const View = importView(type, prefix, component);
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

export const addComponentsByZone = (type, zone, contextobs, page, widgets) => {
  return ShowComponentsByZone(type, zone, contextobs, page, widgets);
}

export const ShowComponentsByZone = (type, zone, contextobs, page, widgets) => {
  // if context is not present, use context from store, therefore it can not be a function 
  const {context} = useSnStore((state) => state);

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
      const compoId = (!child?.CacheKey) ? `${type}-${zone}-${child?.Name}` : `${type}-${zone}-${child?.CacheKey}`;
      console.log('add component by zone - widget: ', { type: type}, {zone: zone}, {context: context}, {page: page}, {child: child}, {compoType: compoType}, {compoId:compoId});
      return addComponent(type, prefix, compoType.toLowerCase(), `${compoId}`, null, null, child);
    })
  );
};

export const addLayout = (contextAsWidget, setLayout) => {
  let layout = 'explore';

  if (DATA.autoLayout[contextAsWidget.Type] !== undefined) {
    layout = DATA.autoLayout[contextAsWidget.Type];
  } else if (contextAsWidget.IsFolder && DATA.autoLayout.isFolder !== undefined) {
    layout = DATA.autoLayout.isFolder;
  } else if (!contextAsWidget.IsFolder && DATA.autoLayout.notFolder !== undefined) {
    layout = DATA.autoLayout.notFolder;
  }

  console.log(`add ${layout} layout`, { type: contextAsWidget.Type }, { isFolder: contextAsWidget.IsFolder }, { setting: layout });
  setLayout(layout);
  return addComponent('layouts', 'page', layout, `page-${layout}`, contextAsWidget);
};

// --- End Dynamic Component Resolution ---

