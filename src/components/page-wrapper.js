import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent } from './utils/add-component';

const DATA = require('../config.json');

export const PageWrapper = (props) => {
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  const [context, setContext] = useState();
  const locationPath = props.location.pathname;
  const path = props.location.pathname.split('/');
  console.log("page wrapper", props, path);

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    const pageQuery = () => { 
      let query="";
      if (context.Type === 'Page' || context.Type === 'Layout') {
        query = `Path:'${context.Path}' OR TypeIs:Widget AND InTree:'${context.Path}' AND Hidden:0`;
      } else {
        query =`((Name:'${context.Type}' OR (Name:'This' AND InFolder:'${context.Path}/(layout)')) AND Type:(Page Layout))
        OR TypeIs:Widget 
        AND InTree:(
          '${context.Path}/(layout)' 
          '${process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath}/${context.Type}'       
          ) 
        AND Hidden:0`;
      }
  
      console.log('query to select layout', query);
      return query;   
    };

    console.log('context type', context.Type);
    if (context !== undefined && context.Type !== undefined && context.Type !== []) {
      // const query = (context.Type === 'Page' || context.Type === 'Layout') ? 
      // `Path:'${context.Path}' OR TypeIs:Widget AND InTree:'${context.Path}' AND Hidden:0`
      // : `Name:'${context.Type}' AND Type:(Page Layout) OR TypeIs:Widget AND InTree:'${process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath}/${context.Type}' AND Hidden:0`;
      const query = pageQuery();
      // const queryPath = (context.Type === 'Page' || context.Type === 'Layout') ? `${context.Path}` : `${process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath}`;
      const queryPath = `/Root/Content`;
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
          const page = result.d.results.filter(pcnt => pcnt.Type === 'Page' || pcnt.Type === 'Layout').sort((a, b) => a.Depth < b.Depth ? 1 : -1)[0];
          const widgets = result.d.results.filter(pcnt => pcnt.ParentId === page.Id);
          const layout = page.PageTemplate === '' || page.PageTemplate === null ? "vanilla" : page.PageTemplate;
          console.log('selected page: ', result.d.results, page, widgets, layout );

          // setCompo(addComponent('layouts', 'page', "vanilla", `cnt-${context.Id}`, context));
          setCompo(addComponent('layouts', 'page', layout, `page-${context.Id}`, context, page, widgets)); 
        } else {
          console.log('no page was found - else:', context.Type.toLowerCase());
          setCompo(addComponent('layouts', 'page', "vanilla", `page-${context.Id}`, context));
          // setCompo(addComponent('content', 'content', context.Type.toLowerCase(), `cnt-${context.Id}`, context));
        }
      }).catch(error => {
        console.log('error on loading page: ', error);
        // setCompo(addComponent('content', 'content', context.Type.toLowerCase(), `err-${context.Id}`, context));
        setCompo(addComponent('layouts', 'page', "vanilla", `page-${context.Id}`, context)); 
      });
    };
  }, [context, repo]);

  const loadContent = useCallback(async () => {
    const locationPathWorkaround = locationPath.replace("(", "%28").replace(")", "%29");
    await repo.load({
      idOrPath: `${process.env.REACT_APP_DATA_PATH || DATA.dataPath}/${locationPathWorkaround}`,
      oDataOptions: {
        select: 'all',
        expand: 'Workspace'
      },
    }).then(result => {
      if (result?.d?.Type) {
        console.log('First level context:', result.d);
        setContext(result.d);
      };
    })
    .catch(error => {
      // setCompo(addComponent('content', 'auto', 'missing', 1));
      setCompo(addComponent('layouts', 'page', 'leisure-error', 1));
    });
  }, [locationPath, repo]);

  useEffect(() => {
    console.log("Load content useEffect:", locationPath);
    loadContent();
  }, [locationPath, loadContent, repo]);

  useEffect(() => {
    if (context !== undefined && context !== []) {
      console.log("Load page useEffect:", context);
      loadPage();
    } else {
      console.log('Skip page load useEffect');
    }
  }, [context, loadPage, repo]);

  return ( 
    <React.Suspense fallback='Loading views...'>
        {wrappercompo}
    </React.Suspense>
  )
};
