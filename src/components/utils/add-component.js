import React, { lazy } from 'react';

const defaultComponent = 'folder';
const importView = (prefix, component) =>
  lazy(() =>
    import(`../content/${prefix}-${component}`).catch(() =>
      import(`../content/content-${defaultComponent}`)
    )
  );

export const addComponent = (prefix, component, id, context, widget, page) => {
  const View = importView(prefix, component);
  return (
    <div className='container'>
      <View key={id} data={context} widget={widget} page={page} />
    </div>
  );
};
