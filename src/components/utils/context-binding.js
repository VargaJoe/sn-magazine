import { useCallback, useEffect, useState } from "react";
import { useRepository } from "@sensenet/hooks-react";
import { withRouter } from "react-router";

const DATA = require('../../config.json');

export function BindedContext(props, withChildren) {
  const repo = useRepository();
  const [bndContext, setContext] = useState({
                                      content: props.data,
                                      children: []
                                    });  

  console.log("context binding: ", props);
  const widget = props.widget;
  const context = props.data;

  let contextPath = context.Path;

  console.log(widget.ContextBinding);
  switch (widget.ContextBinding[0]) {
    case "customroot":
      if (widget.CustomRoot !== undefined) {
        
        contextPath = widget.CustomRoot.Path;
      } else {
        console.log("customroot is not set");
      }
      break;
    case "currentsite":
      contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
      break;
    default:
      // no problem
  }

  if (widget.RelativePath !== null && widget.RelativePath !== undefined) {
    contextPath += widget.RelativePath;
  }

  const loadContents = useCallback(async () => {
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
      console.log(result);
      setContext({
        content: result.d.results
          .filter(cnt => cnt.Path === contextPath)[0],
        children: result.d.results      
          .filter(cnt => cnt.Path !== contextPath)
      });
    } else {
    }
  }, [contextPath, widget.ContentQuery, repo]);

  useEffect(() => {
    if (withChildren) {
      loadContents();
    } 
  }, [loadContents, withChildren]);

  return bndContext;
}

export default BindedContext;
