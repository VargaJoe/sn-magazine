import React, { lazy } from 'react';

const defaultComponent = 'folder';
const importView = (prefix, component) =>
  lazy(() =>
    import(`../content/${prefix}-${component}`).catch(() =>
      import(`../content/${prefix}-${defaultComponent}`)
    )
  );

export const addComponent = (prefix, component, id, context, page) => {
  const View = importView(prefix, component);
  return (
    <div className='container'>
      <View key={id} data={context} page={page} />
    </div>
  );
};
