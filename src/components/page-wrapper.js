import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent, addLayout } from './utils/add-component';
import { useLocation } from 'react-router-dom';
import { useSnStore } from "./store/sn-store";


const DATA = require('../config.json');

export const PageWrapper = (props) => {
  const location = useLocation();
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  // const [context, setContext] = useState();
  const { context, setContext, setLayout, setPage, setWidgets } = useSnStore();
  const locationPath = location.pathname;
  const path = locationPath.split('/');
  console.log('%cpageWrapper', "font-size:16px;color:green");

  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || DATA.layoutType || "Layout";
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || DATA.widgetType || "Widget";

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    console.log('%cloadPage', "font-size:14px;color:green");
    console.log("Context of Load page:", context);

    // layoutPathList: return path list of possible layoutdeclarations
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
      console.log('LPL', lpl);
      return lpl;
    };

    // pageQuery: return query to select effective layout declaration
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
      // console.log('query to select layout', query);
      return query;   
    };

    // console.log('context type', context.Type);
    if (context !== undefined && context.Type !== undefined) {
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

          setPage(page);
          setWidgets(widgets);
          setLayout(layout);
          console.log('selected page: ', { results: result.d.results }, { page: page.Name, meta: page}, { widgets: widgets }, { layput: layout } );
          const addedComponent = addComponent('layouts', 'page', layout, `page-${layout}`, null, null, null)
          
          if (wrappercompo.key !== addedComponent.key) {
            console.log('set page load useEffect', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
            setCompo(addedComponent);
          } else {
            console.log('skip page load useEffect');
          }

          // setCompo(addedComponent);
        } else {
          console.warn('no page was found - else:', context.Type.toLowerCase());
          
          setCompo(addLayout(context));
        }
      }).catch(error => {
        console.error('error on loading page: ', error);
        
        // TODO: error page 
        // setCompo(addComponent('layouts', 'page', "vanilla", `err-${context.Id}`, context)); 
        setCompo(addLayout(context));
      });
    };
  }, [context, layoutContentType, repo, setLayout, setPage, setWidgets, widgetContentType, wrappercompo]);

  const loadContent = useCallback(async () => {
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
        setContext(result.d);
      };
    })
    .catch(error => {
      setCompo(addComponent('layouts', 'page', 'error', 1));
    });
  }, [locationPath, repo, setContext]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (context !== undefined && context.Type !== undefined) {
      loadPage();
    } else {
      console.warn('Skip page load useEffect');
    }
  }, [context, loadPage, repo]);

  return ( 
    <React.Suspense fallback='Loading views...'>
        {wrappercompo}
    </React.Suspense>
  )
};
