import React from 'react';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

export function MenuList(props) {
  console.groupCollapsed('%cmenu', 'font-size:16px;color:green');
  console.log('menu list', props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;  
  const bindedContext = BindedContext(props, true);
  
  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }
  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu", context, layout, widget)}
      <div className="w3-container">
        <h4 className="w3-center hidden">{widget.DisplayName}</h4>
        <hr className="no-margin"/>
        <div className="side-menu-uppercase">
          {bindedContext.children?.map((child) => {
            console.log(child.Name);
            return (
            <p key={`sidemenu-${child.Id}`}>
              {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
              <Link key={`sidemenu-link-${child.Id}`} to={'/' + child.Name} className="side-menu-link" title={'index: '+child.Index}>
                {child.DisplayName}
              </Link>
            </p>
          )})}
        </div>
      </div>
      {console.groupEnd()}
    </div>
  );
}

export default MenuList;