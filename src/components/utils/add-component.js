import React, { lazy } from 'react';
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');

const defaultComponent = 'default';
let lazyComponents = [];
function importView(type, prefix, component) {
  if (lazyComponents !== null && lazyComponents !== undefined) {
    let lazyView = lazyComponents.filter(ptmplt => ptmplt.type === type && ptmplt.prefix === prefix && ptmplt.component === component)[0];
    if (lazyView === undefined) {
      lazyView = {
        type: type,
        prefix: prefix,
        component: component,
        view: lazy(() =>
        import(`../${type}/${prefix}-${component}`).catch(() =>
        import(`../${type}/auto-${defaultComponent}`)
      ))}
      lazyComponents.push(lazyView);
      console.log('new component added: ', lazyView.component);
    } else {
      console.log('already loaded component: ', lazyView.component);
    };
    return lazyView.view;
  }
};

export const addComponent = (type, prefix, component, id, context, page, widget) => {
  const View = importView(type, prefix, component);
  // widgets can be top level or nested
  // top level widgets usually get context from store
  // nested widgets get context from parent widget
  return (
      <View key={id} 
      data={context} 
      // page={page} 
      widget={widget} />
  );
};

export const addComponentsByZone = (type, zone, contextobs, page, widgets) => {
  return ShowComponentsByZone(type, zone, contextobs, page, widgets);
}

export const ShowComponentsByZone = (type, zone, contextobs, page, widgets) => {
// export const ShowComponentsByZone = ({ type, zone, contextobs, page, widgets }) => {
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
  return addComponent('layouts', 'page', layout, `page-0`, contextAsWidget);
};

