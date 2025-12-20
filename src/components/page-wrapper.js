import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent, addLayout } from './utils/add-component';
import { useLocation } from 'react-router-dom';
import { useSnStore } from "./store/sn-store";
import CommonHelmet from './layouts/partial-head';
import { maintenanceTemplate } from '../configuration';
// import MaintenanceLayout from './layouts/page-maintenance';
// import MaintenanceLeisureLayout from './layouts/page-maintenance-leisure';

const DATA = require('../config.json');

export const PageWrapper = (props) => {
  const location = useLocation();
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  // const [context, setContext] = useState();
  const { context, setContext, setLayout, setPage, setWidgets } = useSnStore();
  const locationPath = location.pathname;
  // --- Debug instance identity ---
  const instanceId = useRef(Math.random().toString(36).substr(2, 8));
  const renderCount = useRef(0);
  renderCount.current += 1;
  // --- End debug instance identity ---

  // --- Debug: track previous context and page for shallow equality ---
  const prevContextRef = useRef();
  const prevPageRef = useRef();
  const [debugPage, setDebugPage] = useState(); // local page state for debug

  // Shallow equality check helper
  function shallowEqual(objA, objB) {
    if (objA === objB) return true;
    if (!objA || !objB) return false;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (objA[key] !== objB[key]) return false;
    }
    return true;
  }

  // Patch setPage to also update local debug state
  const setPageDebug = useCallback((p) => {
    setPage(p);
    setDebugPage(p);
  }, [setPage]);

  useEffect(() => {
    // Log on every render and navigation
    const contextChanged = !shallowEqual(context, prevContextRef.current);
    const pageChanged = !shallowEqual(debugPage, prevPageRef.current);
    console.log('%c[PageWrapper] Render', 'color:orange;font-weight:bold', {
      instanceId: instanceId.current,
      renderCount: renderCount.current,
      locationPath,
      contextType: context?.Type,
      contextId: context?.Id,
      contextPath: context?.Path,
      contextChanged,
      prevContext: prevContextRef.current,
      currentContext: context,
      pageChanged,
      prevPage: prevPageRef.current,
      currentPage: debugPage,
      wrappercompoKey: wrappercompo?.key,
      wrappercompoType: wrappercompo?.type,
      wrappercompoName: wrappercompo?.props?.name,
      wrappercompoProps: wrappercompo?.props,
    });
    prevContextRef.current = context;
    prevPageRef.current = debugPage;
  });

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
    if (context !== null && context !== undefined && context.Type !== undefined) {
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
          const widgets = page?result.d.results?.filter(pcnt => pcnt.ParentId === page.Id):undefined;
          // const layout = !page || page.PageTemplate === '' || page.PageTemplate === null ? "vanilla" : page.PageTemplate;

          setPageDebug(page);
          setWidgets(widgets);
          // setLayout(layout);
          console.log('selected page: ', { results: result.d.results }, { page: page?.Name, meta: page}, { widgets: widgets }, { layout: page?.PageTemplate } );
          const addedComponent =  !page || page.PageTemplate === '' || page.PageTemplate === null ? 
            addLayout(context, setLayout) :
            addComponent('layouts', 'page', page.PageTemplate, `page-${page.PageTemplate}`, null, null, null);
          // const addedComponent =  addComponent('layouts', 'page', page.PageTemplate, `page-${page.PageTemplate}`, null, null, null);
          
          if (wrappercompo.key !== addedComponent.key) {
            console.log('set page load useEffect then', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
            setCompo(addedComponent);
          } else {
            console.log('skip page load useEffect then');
          }
        } else {
          console.warn('no page was found - else:', context.Type.toLowerCase());
          
          const addedComponent = addLayout(context, setLayout)
          if (wrappercompo.key !== addedComponent.key) {
            console.log('set page load useEffect else', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
            setCompo(addedComponent);
          } else {
            console.log('skip page load useEffect else');
          }          
        }
      }).catch(error => {
        console.error('error on loading page: ', error);
        
        // TODO: error page 
        // setCompo(addComponent('layouts', 'page', "vanilla", `err-${context.Id}`, context)); 
        const addedComponent = addLayout(context, setLayout)
        if (wrappercompo.key !== addedComponent.key) {
          console.log('set page load useEffect catch', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
          setCompo(addedComponent);
        } else {
          console.log('skip page load useEffect catch');
        }
      });
    };
  }, [context, layoutContentType, repo, setLayout, setPageDebug, setWidgets, widgetContentType, wrappercompo]);

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
    .catch(connectionrefused => {
        console.error('Connection refused on loading page: ', connectionrefused);
        // setCompo(addComponent('layouts', 'page', 'maintenance', 1));
        
        setCompo(addComponent('layouts', 'page', maintenanceTemplate, 666));


        // // const addedComponent = addComponent('layouts', 'page', 'maintenance', `page-maintenance`, null, null, null);
        // // setCompo(addedComponent);
        // // if (maintenance) {
        //   switch (maintenanceTemplate) {
        //     case 'maintenance-leisure':
        //        return <MaintenanceLeisureLayout />;
        //     case 'maintenance':
        //     default:
        //       setCompo(addComponent('layouts', 'page', 'maintenance', 666));
        //       // return <MaintenanceLayout />;
        //   }
        // // }
    })
    .catch(error => {
      console.error('error on loading content: ', error);
      setCompo(addComponent('layouts', 'page', 'error', 1));
    });
  }, [locationPath, repo, setContext]);

  useEffect(() => {
    // Log on every render and navigation
    console.log('%c[PageWrapper] Render', 'color:orange;font-weight:bold', {
      instanceId: instanceId.current,
      renderCount: renderCount.current,
      locationPath,
      contextType: context?.Type,
      contextId: context?.Id,
      contextPath: context?.Path,
      wrappercompoKey: wrappercompo?.key,
      wrappercompoType: wrappercompo?.type,
      wrappercompoName: wrappercompo?.props?.name,
      wrappercompoProps: wrappercompo?.props,
    });
  });

  useEffect(() => {
    if (locationPath !== null && locationPath !== undefined) {
      console.log('%c[PageWrapper] useEffect: locationPath changed', 'color:orange', { instanceId: instanceId.current, locationPath });
      loadContent();
    }
  }, [loadContent, locationPath, repo]);

  useEffect(() => {
    if (context != null && context !== undefined) {
      console.log('%c[PageWrapper] useEffect: context changed', 'color:orange', { instanceId: instanceId.current, context });
      loadPage();
    } else {
      console.log('%c[PageWrapper] useEffect: context is null/undefined', 'color:orange', { instanceId: instanceId.current });
    }
  }, [context, loadPage, repo]);

  if (wrappercompo === undefined || wrappercompo === null)
    return null;

  if (context === undefined || wrappercompo === undefined || wrappercompo === null)
  return null;

  return ( 
    <React.Suspense>
      <CommonHelmet
        context={context}
      />
      {/* Debug info for layout node and wrappercompo */}
      <div style={{display:'none'}} data-debug-pagewrapper={JSON.stringify({
        instanceId: instanceId.current,
        renderCount: renderCount.current,
        locationPath,
        contextType: context?.Type,
        contextId: context?.Id,
        contextPath: context?.Path,
        wrappercompoKey: wrappercompo?.key,
        wrappercompoType: wrappercompo?.type,
        wrappercompoName: wrappercompo?.props?.name,
        wrappercompoProps: wrappercompo?.props,
      })} />
      {wrappercompo}
    </React.Suspense>
  )
};
