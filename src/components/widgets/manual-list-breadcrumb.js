import React from 'react';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

export function Breadcrumb(props) {
  console.log('%cbreadcrumb', 'font-size:16px;color:green');
  console.log('breadcrumb', props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;  
  const bindedContext = BindedContext(props, true);

  const DATA = require('../../config.json');
  const illegalBreadcrumbs = (process.env.REACT_APP_DATA_PATH || DATA.dataPath).split('/').filter(element => element);
  const breadcrumbs = bindedContext.content.Path.split('/').filter(element => element);
  
  function showBreadcrumbItem (item, index, useLink) { 
    if (useLink) {
      const pathToCrumbItem = bindedContext.content.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length).split('/', index).join("/")
      console.log(index, pathToCrumbItem)
      return (
        <span key={`sidemenu-${item}`}>
          {
          <Link key={`sidemenu-link-${item}`} to={pathToCrumbItem} className="side-menu-link" title={item}>
            /{item}
          </Link>
          }
        </span>
      )
    } 

    return (
      <span key={`sidemenu-${item}`}>
          /{item}
      </span>
    )
  };

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }
  return (
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("side menu", context, layout, widget)}
          <div className="w3-container w3-padding">
            <h4 className="w3-center hidden">{widget.DisplayName}</h4>
            <hr className="no-margin"/>
            <div className="w3-left-align">
              {breadcrumbs?.map((crumb, index) => {
                console.log(illegalBreadcrumbs, breadcrumbs, crumb, index)
                return showBreadcrumbItem(crumb, index - 1, index >= illegalBreadcrumbs.length - 1)
              })}
            </div>
          </div>
        </div>
      </div>
      {}
    </div>
  );
}

export default Breadcrumb;