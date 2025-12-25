import { useCallback, useEffect, useState, useMemo } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');

export function BindedContext(props, withChildren) {
  const repo = useRepository();
  const context = useSnStore((state) => state.context);
  
  // if context defined explicitly via props, use it, otherwise use context from store
  const expContext = props.data || props.data?.context || context;
  const widget = props.widget;
  const [bndContext, setContext] = useState({
                                      contextPath: null,
                                      // content: props.data,
                                      content: null,
                                      children: []
                                    });
  const [loading, setLoading] = useState(false);

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
  
  console.log('bindedContext params', { widgetId: widget?.Id, withChildren });
  // const widget = props.widget;
  // const context = props.data; 

  const loadContents = useCallback(async () => {
    setLoading(true);
    function getPreContextObj() {
      let resultObj = {
            contextPath:  expContext.Path,
            content: expContext,
            children: [],
            reload: (withChildren) ? true : false,
            level: (widget?.ChildrenLevel !== undefined) ? widget.ChildrenLevel[0] : null
      }

      if (widget !== undefined && widget.ContextBinding !== undefined) {
        switch (widget.ContextBinding[0]) {
          case "currentcontext":
            resultObj.contextPath = context.Path
            resultObj.content = context
            break;
          case "customroot":
            if (widget.CustomRoot) {
              resultObj.contextPath = widget.CustomRoot.Path
              resultObj.content = widget.CustomRoot
            } else {
              console.log("customroot is not set");
            }
            break;
          case "currentsite":
            if (context.Workspace) {
              resultObj.contextPath = context.Workspace?.Path
              resultObj.content = context.Workspace
            } else {
              resultObj.contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath
              resultObj.content = context.Workspace
            }
            break;
          case "CurrentReference":
            // ? 
            break;
          default:
            //no problem
        }
    
        if (widget.RelativePath) {
          resultObj.contextPath += widget.RelativePath
          resultObj.reload = true
        }
      }

      return resultObj;
    };


    // currentcontext, customroot, currentsite(=workspace) gives context immediatelly 
    // const contextPath = getContextPath();
    const contextObj = getPreContextObj();

    if (!contextObj.reload) {
      setContext(prevContext => {
        if (shallowEqual(prevContext, contextObj)) {
          return prevContext;
        }
        return contextObj;
      });
    }

    const options = {
      expand: 'Workspace',
      select: 'all',
      metadata: 'no'
    }

    // when context is a smartfolder we must not use query as it would use InTree and smartfolder's own query would be busted
    if (contextObj.content.Type !== 'SmartFolder') {
      if (contextObj.level === undefined 
        || contextObj.level === null        
        || contextObj.level === 'child'
        || contextObj.level === '') {

        if (widget !== undefined && widget.ContentQuery !== undefined) {
          options.query = widget.ContentQuery
        }

        // only first level children
        options.query += `(${options.query} +InFolder:'${contextObj.contextPath}') Path:'${contextObj.contextPath}'`
      } else if (contextObj.level === 'deep') {
        // get deep descendants
        options.query = widget.ContentQuery
      }
    } 

    if (widget !== undefined && widget?.Expand !== null && widget?.Expand !== '') {
      options.expand += ','+widget.Expand
    } 

    console.log('options', options);

    // relativepath have to be loaded
    const result = await repo.loadCollection({
      path: `${contextObj.contextPath}`,
      oDataOptions: options,
    });
    if (result?.d?.results) {
      contextObj.children = result.d.results.filter(cnt => cnt.Path !== contextObj.contextPath)

      if (result.d.results.filter(cnt => cnt.Path === contextObj.contextPath)[0] !== undefined) {
        contextObj.content = result.d.results.filter(cnt => cnt.Path === contextObj.contextPath)[0] 
      }
      // Only update state if the contextObj has actually changed
      setContext(prevContext => {
        if (shallowEqual(prevContext, contextObj)) {
          return prevContext; // No change, return previous state
        }
        return contextObj; // Update with new state
      });
    } else {
      // Handle case where no results
      const emptyContext = {
        contextPath: contextObj.contextPath,
        content: contextObj.content,
        children: []
      };
      setContext(prevContext => {
        if (shallowEqual(prevContext, emptyContext)) {
          return prevContext;
        }
        return emptyContext;
      });
    }
    setLoading(false);
  }, [context?.Path, widget?.Id, withChildren]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);
  
  console.log('bindedContext result', { contextPath: bndContext.contextPath, childrenCount: bndContext.children?.length });
  return useMemo(() => ({ ...bndContext, loading }), [bndContext, loading]);
}

export default BindedContext;
