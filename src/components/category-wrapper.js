import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';
import { addComponent } from './utils/add-component';

const DATA = require('../config.json');

export const CategoryWrapper = (props) => {
  const repo = useRepository();
  const [dynacompo, setCompo] = useState([]);
  // const { categoryName } = useParams();
  const categoryName = props.location.pathname;
  const [context, setContext] = useState();
  console.log("props");
  console.log(props);  

  const path = props.location.pathname.split('/');
  console.log("path");
  console.log(path);

  const loadPage = useCallback(async () => {
    console.log(context.Type);
    if (context !== undefined && context.Type !== undefined && context.Type !== []) {
      const query = (context.Type === 'PageContainer') ? 
      `Path:'${context.Path}' OR TypeIs:PageComponent AND InTree:'${context.Path}' AND Hidden:0 .LIFESPAN:ON`
      : `Name:'${context.Type}' AND Type:PageContainer OR TypeIs:PageComponent AND InTree:'${DATA.pagecontainerPath}/${context.Type}' AND Hidden:0 .LIFESPAN:ON`;
      const queryPath = (context.Type === 'PageContainer') ? `${context.Path}` : `${DATA.pagecontainerPath}`;
      await repo.loadCollection({
        path: queryPath,
        oDataOptions: {
          query: query,
          expand: ['CustomRoot'],
          orderby: ['Index'],
          select: "all", 
        },
      }).then(result => {
        if (result?.d?.results && result?.d?.results.length > 0) {
          console.log("page");
          console.log(result.d.results);

          setCompo(
            result.d.results.filter(pcnt => pcnt.Type !== 'PageContainer').map((child) => { 
              const compoType = child.ClientComponent === undefined || child.ClientComponent === null || child.ClientComponent === '' ? child.Type : child.ClientComponent;
              console.log('addcompo: '+compoType.toLowerCase())
              return addComponent('component', compoType.toLowerCase(), `${context.Id}-${child.Id}`, context, child, result.d.results); 
              // return addComponent('component', child.ClientComponent.toLowerCase()===''?child.ClientComponent.toLowerCase():child.Type.toLowerCase(), child.Id, context, child, result.d.results); 
            })
          );
        } else {
          console.log('else:'+context.Type.toLowerCase());
          setCompo(addComponent('content', context.Type.toLowerCase(), `cnt-${context.Id}`, context));
        }
      }).catch(error => {
        console.log(error);
        setCompo(addComponent('content', context.Type.toLowerCase(), `err-${context.Id}`, context));
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
      setCompo(addComponent('content', 'missing', 1));
    });
  }, [categoryName, repo]);

  useEffect(() => {
    loadContent();
  }, [categoryName, loadContent, repo]);

  useEffect(() => {
    if (context !== undefined && context !== []) {
      console.log('load page');
      console.log(context);
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
