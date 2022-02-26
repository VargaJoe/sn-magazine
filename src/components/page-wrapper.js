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

  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || DATA.layoutType || "Layout";
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || DATA.widgetType || "Widget";

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    const pageQuery = () => { 
      let query="";
      if (context.Type === layoutContentType) {
        query = `Path:'${context.Path}' OR TypeIs:${widgetContentType} AND InTree:'${context.Path}' AND Hidden:0`;
      } else {
        query =`((Name:'${context.Type}' OR (Name:'This' AND InFolder:'${context.Path}/(layout)')) AND Type:${layoutContentType})
        OR TypeIs:${widgetContentType} 
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
      const query = pageQuery();
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
          const page = result.d.results.filter(pcnt => pcnt.Type === layoutContentType).sort((a, b) => a.Depth < b.Depth ? 1 : -1)[0];
          const widgets = result.d.results.filter(pcnt => pcnt.ParentId === page.Id);
          const layout = page.PageTemplate === '' || page.PageTemplate === null ? "vanilla" : page.PageTemplate;
          console.log('selected page: ', result.d.results, page, widgets, layout );

          setCompo(addComponent('layouts', 'page', layout, `page-${context.Id}`, context, page, widgets)); 
        } else {
          console.log('no page was found - else:', context.Type.toLowerCase());
          setCompo(addComponent('layouts', 'page', "wide", `page-${context.Id}`, context));
        }
      }).catch(error => {
        console.log('error on loading page: ', error);
        setCompo(addComponent('layouts', 'page', "vanilla", `err-${context.Id}`, context)); 
      });
    };
  }, [context, layoutContentType, repo, widgetContentType]);

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
      setCompo(addComponent('layouts', 'page', 'error', 1));
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
