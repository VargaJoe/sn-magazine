import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useParams } from 'react-router-dom';
import { addComponent } from './utils/add-component';

const DATA = require('../config.json');

export const PageWrapper = (props) => {
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  // const { categoryName } = useParams();
  const categoryName = props.location.pathname;
  const [context, setContext] = useState();
  const [pageTemplates, setPts] = useState([]);
  console.log("props");
  console.log(props);  

  const path = props.location.pathname.split('/');
  console.log("path");
  console.log(path);

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    console.log(context.Type);
    if (context !== undefined && context.Type !== undefined && context.Type !== []) {
      const query = (context.Type === 'Page') ? 
      `Path:'${context.Path}' OR TypeIs:Widget AND InTree:'${context.Path}' AND Hidden:0`
      : `Name:'${context.Type}' AND Type:Page OR TypeIs:Widget AND InTree:'${process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath}/${context.Type}' AND Hidden:0`;
      const queryPath = (context.Type === 'Page') ? `${context.Path}` : `${process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath}`;
      await repo.loadCollection({
        path: queryPath,
        oDataOptions: {
          query: query,
          expand: ['CustomRoot'],
          orderby: ['Index'],
          select: "all",      
          enablelifespanfilter: "on",
          enableautofilters: "off"
        },
      }).then(result => {
        if (result?.d?.results && result?.d?.results.length > 0) {
          console.log("page");
          console.log(result.d.results);
          const page = result.d.results.filter(pcnt => pcnt.Type === 'Page')[0];
          const pageTemplate = page.PageTemplate === '' || page.PageTemplate === null ? "vanilla" : page.PageTemplate;
          // console.log('pt: '+pageTemplate);

          // setCompo(addComponent('page-templates', 'page', "vanilla", `cnt-${context.Id}`, context));
          setCompo(addComponent('page-templates', 'page', pageTemplate, `page-${context.Id}`, context, result.d.results)); 
        } else {
          console.log('else:'+context.Type.toLowerCase());
          setCompo(addComponent('page-templates', 'page', "vanilla", `page-${context.Id}`, context));
          // setCompo(addComponent('content', 'content', context.Type.toLowerCase(), `cnt-${context.Id}`, context));
        }
      }).catch(error => {
        console.log(error);
        // setCompo(addComponent('content', 'content', context.Type.toLowerCase(), `err-${context.Id}`, context));
        setCompo(addComponent('page-templates', 'page', "vanilla", `page-${context.Id}`, context)); 
      });
    };
  }, [context, repo]);

  const loadContent = useCallback(async () => {
    await repo.load({
      idOrPath: `${process.env.REACT_APP_DATA_PATH || DATA.dataPath}/${categoryName}`,
      oDataOptions: {
        select: 'all',
      },
    }).then(result => {
      if (result?.d?.Type) {
        console.log('First level context:');
        console.log(result.d);
        setContext(result.d);
      };
    })
    .catch(error => {
      setCompo(addComponent('content', 'content', 'missing', 1));
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
        {wrappercompo}
    </React.Suspense>
  )
};
