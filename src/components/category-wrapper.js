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
  const [contextType, setContextType] = useState();
  const [context, setContext] = useState([]);
  const [page, setPage] = useState([]);
  console.log("props");
  console.log(props);
  const loadPage = useCallback(async () => {
    console.log("contextType");
    console.log(contextType);
    if (contextType !== undefined && contextType !== []){
      await repo.loadCollection({
        path: `${DATA.pagecontainerPath}`,
        oDataOptions: {
          query: `Name:'${contextType}' AND Type:PageContainer OR TypeIs:PageComponent AND InTree:'${DATA.pagecontainerPath}/${contextType}' AND Hidden:0 .LIFESPAN:ON`,
          orderby: ['Index'],
          select: "all", 
        },
      }).then(result => {
        if (result?.d?.results) {
          setPage(result.d.results);
          console.log("page");
          console.log(result.d.results);

          const View = importPage(contextType.toLowerCase());
          setCompo(<View key={context.Id} data={context} page={result.d.results} />);
        } 
      }).catch(error => {
        const View = importView(contextType.toLowerCase());
        setCompo(<View key={context.Id} data={context} />);
      });
    };
  }, [context, contextType, repo]);

  const loadContent = useCallback(async () => {
    await repo.load({
      idOrPath: `${DATA.dataPath}/${categoryName}`,
      oDataOptions: {
        select: 'all',
      },
    }).then(result => {
      if (result?.d?.Type) {
        setContext(result.d);
        setContextType(result.d.Type);
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
    loadPage();
  }, [contextType, loadPage, repo]);

  return (
    <React.Suspense fallback='Loading views...'>
        <div className='container'>{dynacompo}</div>
    </React.Suspense>
  )
};
