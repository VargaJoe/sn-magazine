import React, { lazy, useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';
import { addComponent } from './utils/add-component';

const DATA = require('../config.json');

const defaultComponent = 'folder';

const importView = component =>
  lazy(() =>
    import(`./content/content-${component}`).catch(() =>
      import(`./content/content-${defaultComponent}`)
    )
  );

const importPage = component =>
  lazy(() =>
    import(`./content/content-${component}`).catch(() =>
      import(`./content/content-${defaultComponent}`)
    )
  );

export const CategoryWrapper = (props) => {
  const repo = useRepository();
  const [dynacompo, setCompo] = useState([]);
  const { categoryName } = useParams();
  const [context, setContext] = useState([]);
  // const [page, setPage] = useState([]);
  console.log("props");
  console.log(props);
  
  const loadPage = useCallback(async () => {
    console.log(context.Type);
    if (context !== undefined && context.Type !== undefined && context.Type !== []) {
      await repo.loadCollection({
        path: `${DATA.pagecontainerPath}`,
        oDataOptions: {
          query: `Name:'${context.Type}' AND Type:PageContainer OR TypeIs:PageComponent AND InTree:'${DATA.pagecontainerPath}/${context.Type}' AND Hidden:0 .LIFESPAN:ON`,
          orderby: ['Index'],
          select: "all", 
        },
      }).then(result => {
        if (result?.d?.results && result?.d?.results.length > 0) {
          // setPage(result.d.results);
          console.log("page");
          console.log(result.d.results);

          setCompo(
            result.d.results.filter(pcnt => pcnt.Type !== 'PageContainer').map((child) => { 
              return addComponent('content', child.Type.toLowerCase(), child.Id, context, result.d.results); 
            })
          );
        } else {
          console.log('else:'+context.Type.toLowerCase());
          setCompo(addComponent('content', context.Type.toLowerCase(), context.Id, context));
        }
      }).catch(error => {
        console.log(error);
        setCompo(addComponent('content', context.Type.toLowerCase(), context.Id, context));
      });
    };
  }, [context, repo]);

  const loadContent = useCallback(async () => {
    await repo.load({
      idOrPath: `${DATA.dataPath}/${categoryName}`,
      oDataOptions: {
        select: 'all',
      },
    }).then(result => {
      if (result?.d?.Type) {
        console.log(result.d);
        setContext(result.d);
      };
    })
    .catch(error => {
      const View = importView('missing');
      setCompo(<View key={'1'} />);
    });
  }, [categoryName, repo]);

  useEffect(() => {
    loadContent();
  }, [categoryName, loadContent, repo]);

  useEffect(() => {
    if (context !== undefined && context !== '') {
      console.log('load page');
      loadPage();
    } else {
      console.log('skip page load');
    }
  }, [context, loadPage, repo]);

  return ( 
    <React.Suspense fallback='Loading views...'>
        {dynacompo}
    </React.Suspense>
  )
};
