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
    const result = await repo.loadCollection({
      path: `${contextPath}`,
      oDataOptions: {
        query: '(' + widget.ContentQuery + ` +InFolder:'${contextPath}') Path:'${contextPath}'`,
        expand: 'Workspace',
        select: 'all',
        metadata: 'no' 
      },
    });
    if (result?.d?.results) {
      setContext({
        contextPath: contextPath,
        content: result.d.results
          .filter(cnt => cnt.Path === contextPath)[0],
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
