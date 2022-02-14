import React, { lazy } from 'react';
import LazyLoad from 'react-lazyload';

const defaultComponent = 'genericcontent';
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
        import(`../content/auto-${defaultComponent}`)
      ))}
      lazyComponents.push(lazyView);
      console.log('new component added: ', lazyView.component);
    } else {
      console.log('already loaded component: ', lazyView.component);
    };
    console.log('already loaded component: ', lazyView.view);
    return lazyView.view;
  }
};

export const addComponent = (type, prefix, component, id, context, page, widget) => {
  const View = importView(type, prefix, component);
  // console.log('add component with uniqid: ', id);
  return (
      <View key={id} data={context} page={page} widget={widget} />
  );
};

export const addComponentsByZone = (type, zone, context, page, widgets) => {
  if (widgets === undefined) {
    if (zone === null || zone === 'content') {
      // mod later: use content/auto
      return addComponent('content', 'auto', context.Type.toLowerCase(), `${type}-${zone}-err-${context.Id}`, context)
    } else {
      return null;
    }
  }

  return (
    widgets.filter(pcnt => pcnt.PortletZone === zone).map((child) => { 
      const isAuto = (child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '');
      const compoType = isAuto ? child.Type : child.ClientComponent;
      const prefix = (isAuto) ? "auto" : "manual";
      console.log('add component by zone: ', {type, prefix, compoType});
      return addComponent(type, prefix, compoType.toLowerCase(), `${type}-${zone}-${context.Id}-${child.Id}`, context, page, child);
    })
  );
};
