import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent, addLayout } from './utils/add-component';
import { useLocation } from 'react-router-dom'; 

const DATA = require('../config.json');

export const PageWrapper = (props) => {
  const location = useLocation();
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  const [context, setContext] = useState();
  const locationPath = location.pathname;
  const path = locationPath.split('/');
  console.groupCollapsed('%cpageWrapper', "font-size:16px;color:green");
  console.log("props", props, path);

  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || DATA.layoutType || "Layout";
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || DATA.widgetType || "Widget";

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    console.groupCollapsed('%cloadPage', "font-size:14px;color:green");
    console.log("Load page context:", context);
   
    const layoutPathList = () => {
      const splittedPath = context.Path.split('/').filter(element => element);
      const basePath = process.env.REACT_APP_PAGECONTAINER_PATH || DATA.pagecontainerPath;
      const lpl = [];
      var newPathName = "";
      for (var i = 0; i < splittedPath.length; i++) {
        newPathName += "/";
        newPathName += splittedPath[i];
        lpl[i] = `'${newPathName}/(layout)'`;
      }
      lpl.reverse();
      if (!lpl.includes(`'${basePath}'`))
      {
        lpl[lpl.length]=`'${basePath}'`;
      }
      console.log(lpl);
      return lpl;
    };

    const pageQuery = () => { 
      let query="";
      if (context.Type === layoutContentType) {
        query = `Path:'${context.Path}' OR TypeIs:${widgetContentType} AND InFolder:'${context.Path}' AND Hidden:0`;
      } else {
        query =`
        (
          Name:This AND TypeIs:${layoutContentType} AND Path:'${context.Path}/(layout)/This'
        )
        OR
        (
          (
            (Name:'${context.Type}' AND TypeIs:${layoutContentType})
            OR 
            TypeIs:${widgetContentType}
          )
          AND InTree:(
            ${layoutPathList().join(' ')}
            ) 
          AND Hidden:0
        )`
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
          const addedComponent = addComponent('layouts', 'page', layout, `page-${context.Id}`, context, page, widgets)
          console.groupEnd()
          setCompo(addedComponent);
        } else {
          console.warn('no page was found - else:', context.Type.toLowerCase());
          console.groupEnd()
          setCompo(addLayout(context));
        }
      }).catch(error => {
        console.error('error on loading page: ', error);
        console.groupEnd()
        // TODO: error page 
        // setCompo(addComponent('layouts', 'page', "vanilla", `err-${context.Id}`, context)); 
        setCompo(addLayout(context));
      });
    };
  }, [context, layoutContentType, repo, widgetContentType]);

  const loadContent = useCallback(async () => {
    console.groupCollapsed('%cloadContent', "font-size:14px;color:green");
    console.log("Load content useEffect:", locationPath);
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
        console.groupEnd()
        setContext(result.d);
      };
    })
    .catch(error => {
      setCompo(addComponent('layouts', 'page', 'error', 1));
    });
  }, [locationPath, repo]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (context !== undefined && context !== []) {
      loadPage();
    } else {
      console.warn('Skip page load useEffect');
    }
  }, [context, loadPage, repo]);
  console.groupEnd()

  return ( 
    <React.Suspense fallback='Loading views...'>
        {wrappercompo}
    </React.Suspense>
  )
};
