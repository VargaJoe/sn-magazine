import { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";

const DATA = require('../../config.json');

export function BindedContext(props, withChildren) {
  const repo = useRepository();
  const [bndContext, setContext] = useState({
                                      contextPath: '',
                                      content: props.data,
                                      children: []
                                    });
  
  console.log('bindedContext params', { props, withChildren });
  const widget = props.widget;
  const context = props.data;

  const loadContents = useCallback(async () => {
    function getContextPath() {
      let pathTemp = context.path;
      switch (widget.ContextBinding[0]) {
        case "customroot":
          if (widget.CustomRoot !== undefined) {
            // context could be set here too            
            pathTemp = widget.CustomRoot.Path;
          } else {
            console.log("customroot is not set");
          }
          break;
        case "currentsite":
          pathTemp = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
          break;
        default:
          //no problem
      }
  
      if (widget.RelativePath !== null && widget.RelativePath !== undefined) {
        pathTemp += widget.RelativePath;
      }
  
      return pathTemp;
    };

    const contextPath = getContextPath();
    const options = {
      expand: 'Workspace',
      select: 'all',
      metadata: 'no'
    }
    // when context is a smartfolder we must not use query as it would use InTree and smartfolder's own query would be busted
    if (widget.ContextBinding[0] === 'customroot' && widget.CustomRoot?.Type !== 'SmartFolder') {
      options.query = '(' + widget.ContentQuery + ` +InFolder:'${contextPath}') Path:'${contextPath}'`
    } 

    const result = await repo.loadCollection({
      path: `${contextPath}`,
      oDataOptions: options,
    });
    if (result?.d?.results) {
      setContext({
        contextPath: contextPath,
        content: (result.d.results.filter(cnt => cnt.Path === contextPath)[0] !== undefined) 
          ? result.d.results.filter(cnt => cnt.Path === contextPath)[0] 
          : context,
        children: result.d.results      
          .filter(cnt => cnt.Path !== contextPath)
      });
    } else {
    }
  }, [context, repo, widget]);

  useEffect(() => {
    if (withChildren) {
      loadContents();
    } 
  }, [loadContents, withChildren]);
  
  console.log('bindedContext result', bndContext);
  return bndContext;
}

export default BindedContext;
