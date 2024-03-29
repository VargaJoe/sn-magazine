import { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');

export function BindedContext(props, withChildren) {
  const repo = useRepository();
  const context = useSnStore((state) => state.context);
  
  // if context defined explicitly via props, use it, otherwise use context from store
  const expContext = props.data || context;
  const widget = props.widget;
  const [bndContext, setContext] = useState({
                                      contextPath: context.Path,
                                      // content: props.data,
                                      content: context,
                                      children: []
                                    });
  
  console.log('bindedContext params', { props, withChildren });
  // const widget = props.widget;
  // const context = props.data; 

  const loadContents = useCallback(async () => {
    function getPreContextObj() {
      let resultObj = {
            contextPath:  expContext.Path,
            content: expContext,
            children: [],
            reload: (withChildren) ? true : false,
            level: (widget?.ChildrenLevel !== undefined) ? widget.ChildrenLevel[0] : null

      }

      if (widget !== undefined) {
        switch (widget.ContextBinding[0]) {
          case "customroot":
            if (widget.CustomRoot !== undefined) {
              resultObj.contextPath = widget.CustomRoot.Path
              resultObj.content = widget.CustomRoot
            } else {
              console.log("customroot is not set");
            }
            break;
          case "currentsite":
            if (context.Workspace !== null && context.Workspace !== undefined) {
              resultObj.contextPath = context.Workspace?.Path
              resultObj.content = context.Workspace
            } else {
              resultObj.contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath
              resultObj.content = context.Workspace
            }
            break;
          default:
            //no problem
        }
    
        if (widget.RelativePath !== null && widget.RelativePath !== undefined) {
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
      setContext(contextObj)
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
      setContext(contextObj);
    } else {
    }
  }, [context.Workspace, expContext, repo, widget, withChildren]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);
  
  console.log('bindedContext result', bndContext);
  return bndContext;
}

export default BindedContext;
