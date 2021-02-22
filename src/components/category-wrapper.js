import React, { lazy, useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';

const DATA = require('../config.json');

const defaultComponent = 'folder';

const importView = component =>
  lazy(() =>
    import(`./content/content-${component}`).catch(() =>
      import(`./content/content-${defaultComponent}`)
    )
  );

export const CategoryWrapper = () => {
  const repo = useRepository();
  const [dynacompo, setCompo] = useState([]);
  const { categoryName } = useParams();

  const loadContent = useCallback(async () => {
    await repo.load({
      idOrPath: `${DATA.dataPath}/${categoryName}`,
      oDataOptions: {
        select: 'all',
      },
    }).then(result => {
      if (result?.d?.Type) {
        const View = importView(result.d.Type.toLowerCase());
        setCompo(<View key={result.d.Id} />);
      }
    })
    .catch(error => {
      const View = importView('missing');
      setCompo(<View key={'1'} />);
    });
  }, [categoryName, repo]);

  useEffect(() => {
    loadContent();
  }, [categoryName, loadContent, repo]);


  return (
    <React.Suspense fallback='Loading views...'>
        <div className='container'>{dynacompo}</div>
    </React.Suspense>
  )
};
