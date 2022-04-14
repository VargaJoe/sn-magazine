import React, { lazy } from 'react';

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
  // console.log('add component with uniqid: ', id);
  return (
      <View key={id} data={context} page={page} widget={widget} />
  );
};

export const addComponentsByZone = (type, zone, context, page, widgets) => {
  if (widgets === undefined) {
    console.log('add component by zone - widgets undefined: ', type, zone, context, page);
    if (zone === null || zone === 'content') {
      return addComponent('content', 'auto', context.Type.toLowerCase(), `${type}-${zone}-err-${context.Id}`, context)
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
      console.log('add component by zone - widget: ', type, zone, context, page, child, compoType);
      return addComponent(type, prefix, compoType.toLowerCase(), `${type}-${zone}-${context.Id}-${child.Id}`, context, page, child);
    })
  );
};
