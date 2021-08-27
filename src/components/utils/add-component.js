import React, { lazy } from 'react';

const defaultComponent = 'folder';
const importView = (type, prefix, component) =>
  lazy(() =>
    import(`../${type}/${prefix}-${component}`).catch(() =>
      import(`../content/content-${defaultComponent}`)
    )
  );

export const addComponent = (type, prefix, component, id, context, page, widget) => {
  const View = importView(type, prefix, component);
  console.log('uniqid: '+id);
  return (
    <div className='container'>
      <View key={id} data={context} page={page} widget={widget} />
    </div>
  );
};

export const addComponentsByZone = (type, prefix, zone, context, page) => {

  if (page === undefined) {
    if (zone === null || zone === 'content') {
      return addComponent('content', 'content', context.Type.toLowerCase(), `err-${context.Id}`, context)
    } else {
      return null;
    }
  }

  return (
    page.filter(pcnt => pcnt.Type !== 'PageContainer' && pcnt.PortletZone === zone).map((child) => { 
      const compoType = child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '' ? child.Type : child.ClientComponent;
      console.log('addcompo: '+compoType.toLowerCase())
      return addComponent(type, prefix, compoType.toLowerCase(), `${context.Id}-${child.Id}`, context, page, child);
    })
  );
};
