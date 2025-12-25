import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { addComponent, addLayout } from './utils/add-component';
import { useLocation } from 'react-router-dom';
import { useSnStore } from "./store/sn-store";
import CommonHelmet from './layouts/partial-head';
import { maintenanceTemplate } from '../configuration';
// import MaintenanceLayout from './layouts/page-maintenance';
// import MaintenanceLeisureLayout from './layouts/page-maintenance-leisure';

// Deep equality check for arrays/objects
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

const DATA = require('../config.json');

const PageWrapper = React.memo((props) => {
  const location = useLocation();
  const repo = useRepository();
  const [wrappercompo, setCompo] = useState([]);
  // const [context, setContext] = useState();
  const { context, setContext, setLayout, setPage, setWidgets } = useSnStore();
  const locationPath = location.pathname;
  const loadingRefs = useRef(new Map());
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

  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || DATA.layoutType || "Layout";
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || DATA.widgetType || "Widget";

  // refactor: filters should get from page fields
  const loadPage = useCallback(async () => {
    // console.log('%cloadPage for context', "font-size:14px;color:green", context?.Id);

    const isLoading = loadingRefs.current.get(locationPath);
    if (isLoading) {
      // console.log('loadPage already in progress for locationPath', locationPath, 'skipping');
      return;
    }
    loadingRefs.current.set(locationPath, true);
    if (isLoading) {
      // console.log('loadPage already in progress for context', context?.Id, 'skipping');
      return;
    }
    loadingRefs.current.set(context?.Id, true);

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
      // console.log('LPL', lpl);
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
          // Check if widgets changed before setting
          const currentWidgets = useSnStore.getState().widgets;
          if (!deepEqual(widgets, currentWidgets)) {
            setWidgets(widgets);
          }
          // setLayout(layout);
          // console.log('selected page:', page?.Name, 'widgets:', widgets?.length);
          const addedComponent =  !page || page.PageTemplate === '' || page.PageTemplate === null ? 
            addLayout(context, setLayout) :
            addComponent('layouts', 'page', page.PageTemplate, `page-${page.PageTemplate}`, null, null, null);
          // const addedComponent =  addComponent('layouts', 'page', page.PageTemplate, `page-${page.PageTemplate}`, null, null, null);
          
          if (wrappercompo.key !== addedComponent.key) {
            // console.log('set page load useEffect then', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
            setCompo(addedComponent);
          } else {
            // console.log('skip page load useEffect then');
          }
        } else {
          console.warn('no page was found - else:', context.Type.toLowerCase());
          
          const addedComponent = addLayout(context, setLayout)
          if (wrappercompo.key !== addedComponent.key) {
            // console.log('set page load useEffect else', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
            setCompo(addedComponent);
          } else {
            // console.log('skip page load useEffect else');
          }          
        }
      }).catch(error => {
        console.error('error on loading page: ', error);
        
        // TODO: error page 
        // setCompo(addComponent('layouts', 'page', "vanilla", `err-${context.Id}`, context)); 
        const addedComponent = addLayout(context, setLayout)
        if (wrappercompo.key !== addedComponent.key) {
          // console.log('set page load useEffect catch', { wrappercompo: wrappercompo }, { addedComponent: addedComponent });
          setCompo(addedComponent);
        } else {
          // console.log('skip page load useEffect catch');
        }
      })
      .finally(() => {
        loadingRefs.current.set(locationPath, false);
      });
    };
  }, [context, layoutContentType, widgetContentType, repo, setLayout, setPageDebug, setWidgets]);

  const loadContent = useCallback(async () => {
    // console.log("Load content for:", locationPath);
    const locationPathWorkaround = locationPath.replace("(", "%28").replace(")", "%29");
    await repo.load({
      idOrPath: `${process.env.REACT_APP_DATA_PATH || DATA.dataPath}/${locationPathWorkaround}`,
      oDataOptions: {
        select: 'all',
        expand: 'Workspace'
      },
    }).then(result => {
      if (result?.d?.Type) {
        // console.log('First level context loaded:', result.d.Id);
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
        // }
    })
    .catch(error => {
      console.error('error on loading content: ', error);
      setCompo(addComponent('layouts', 'page', 'error', 1));
    })
    .finally(() => {
    });
  }, [locationPath, repo, setContext]);

  useEffect(() => {
    if (locationPath !== null && locationPath !== undefined) {
      loadContent();
    }
  }, [locationPath, loadContent]);

  useEffect(() => {
    if (context != null && context !== undefined) {
      loadPage();
    }
  }, [context, loadPage]);

  useEffect(() => {
    // Log only on significant changes
    const contextChanged = !shallowEqual(context, prevContextRef.current);
    const pageChanged = !shallowEqual(debugPage, prevPageRef.current);
    if (contextChanged || pageChanged || renderCount.current === 1) {
      console.log('%c[PageWrapper] Render', 'color:orange;font-weight:bold', {
        renderCount: renderCount.current,
        locationPath,
        contextId: context?.Id,
        contextChanged,
        pageChanged,
        wrappercompoKey: wrappercompo?.key,
      });
    }
    prevContextRef.current = context;
    prevPageRef.current = debugPage;
  });

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
});

export default PageWrapper;
