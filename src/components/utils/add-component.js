import React, { lazy } from 'react';

const defaultComponent = 'folder';
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
        import(`../content/content-${defaultComponent}`)
      ))}
      lazyComponents.push(lazyView);
      console.log('new component added: '+lazyView.component);
    } else {
      console.log('already loaded component: '+lazyView.component);
    };

    return lazyView.view;
  }
};

export const addComponent = (type, prefix, component, id, context, page, widget) => {
  const View = importView(type, prefix, component);
  console.log('add component with uniqid: '+id);
  return (
    // <div className='container'>
      <View key={id} data={context} page={page} widget={widget} />
    // </div>
  );
};

export const addComponentsByZone = (type, prefix, zone, context, page, widgets) => {
  if (widgets === undefined) {
    if (zone === null || zone === 'content') {
      return addComponent('content', 'content', context.Type.toLowerCase(), `${type}-${prefix}-${zone}-err-${context.Id}`, context)
    } else {
      return null;
    }
  }

  return (
    widgets.filter(pcnt => pcnt.PortletZone === zone).map((child) => { 
      const compoType = child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '' ? child.Type : child.ClientComponent;
      console.log('addcompo: '+compoType.toLowerCase())
      return addComponent(type, prefix, compoType.toLowerCase(), `${type}-${prefix}-${zone}-${context.Id}-${child.Id}`, context, page, child);
    })
  );
};
