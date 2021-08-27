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

