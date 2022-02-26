import React, { useCallback, useEffect, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
// import { addComponent } from '../utils/add-component';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"

const DATA = require('../../config.json');
const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || DATA.layoutType || "Layout";
const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || DATA.widgetType || "Widget";

export function Menu(props) {
  const repo = useRepository();
  const [itemCollection, setCollection] = useState([]);

  const layout = props.page;
  let context = props.data;
  const widget = props.widget;
  console.log('sidemenu widget', props, layout, context, widget);
  
  console.log(widget.ContextBinding);
  let contextPath = context.Path;
  switch(widget.ContextBinding[0]) {
    case "customroot":
      if (widget.CustomRoot !== undefined) {
        context = widget.CustomRoot
        contextPath = context.Path;
      } else {
        console.log('customroot is not set');
      }
      break;
    case "currentsite":
      contextPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
      break;
    default:
      // code block
  }  

  const loadContents = useCallback(async () => {
    const result = await repo.loadCollection({
      path: `${contextPath}`,
      oDataOptions: {
        query: widget.ContentQuery + ` +InFolder:'${contextPath}'`,
        select: 'all',
      },
    });
    if (result?.d?.results) {
      console.log('sidemenu widget collection', result);
      setCollection(result.d.results);
    } else {
    }
  }, [repo, contextPath, widget.ContentQuery]);

  useEffect(() => {
    loadContents();
  }, [context, loadContents, repo]);

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu", context, layout, widget)}
      <div className="w3-container">
        <h4 className="w3-center">{widget.Title}</h4>
        <hr/>
        <div className="side-menu-uppercase">
          {console.log('itemCollection', itemCollection)}
          {itemCollection?.map((child) => {
            console.log(child.Name);
            return (
            <p key={`sidemenu-${child.Id}`}>
              <Link key={`sidemenu-link-${child.Id}`} to={'/' + child.Name} className="side-menu-link" title={'index: '+child.Index}>
                {child.DisplayName}
              </Link>
            </p>
          )}
          )}
        </div>
      </div>
    </div>
  );
}

export default Menu;