import React from 'react';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

export function MenuListWidget(props) {
  console.log('%cMenuList', 'font-size:16px;color:green', { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;  
  const bindedContext = BindedContext(props, true);
  
  const DATA = require('../../config.json');
  
  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }
  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu", context, page, widget, layout)}
      <div className="w3-container">
        <h4 className="w3-center hidden">{widget.DisplayName}</h4>
        <hr className="no-margin"/>
        <div className="side-menu-uppercase">
          {bindedContext.children?.map((child) => {
            const relativePath = child.Path.substr((process.env.REACT_APP_DATA_PATH || DATA.dataPath).length + 1);
            console.log(child.Name);
            return (
            <p key={`sidemenu-${child.Id}`}>
              {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
              <Link key={`sidemenu-link-${child.Id}`} to={'/' + relativePath} className="side-menu-link" title={'index: '+child.Index}>
                {child.DisplayName}
              </Link>
            </p>
          )})}
        </div>
      </div>
      {}
    </div>
  );
}

export default MenuListWidget;