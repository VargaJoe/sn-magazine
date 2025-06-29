import React, { useRef, useEffect } from 'react';
import { Link } from "react-router-dom";
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export function MenuWithLogoWidget(props) {
  // Deep comparison debug
  const {context, page, layout} = useSnStore((state) => state);
  const prevRef = useRef({ props: null, context: null, page: null, widget: null, layout: null });
  useEffect(() => {
    const prev = prevRef.current;
    const deepChanged =
      JSON.stringify(prev.props) !== JSON.stringify(props) ||
      JSON.stringify(prev.context) !== JSON.stringify(context) ||
      JSON.stringify(prev.page) !== JSON.stringify(page) ||
      JSON.stringify(prev.widget) !== JSON.stringify(props.widget) ||
      JSON.stringify(prev.layout) !== JSON.stringify(layout);
    if (deepChanged) {
      console.log('%c[MenuWithLogoWidget] Deep change detected', 'color:purple;font-weight:bold', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevPage: prev.page, currPage: page,
        prevWidget: prev.widget, currWidget: props.widget,
        prevLayout: prev.layout, currLayout: layout
      });
    } else {
      console.log('%c[MenuWithLogoWidget] No deep change', 'color:purple', {
        prevProps: prev.props, currProps: props,
        prevContext: prev.context, currContext: context,
        prevPage: prev.page, currPage: page,
        prevWidget: prev.widget, currWidget: props.widget,
        prevLayout: prev.layout, currLayout: layout
      });
    }
    prevRef.current = { props, context, page, widget: props.widget, layout };
  });
  console.log('%cMenuWithLogo', 'font-size:16px;color:green', { props: props });

  let widget = props.widget;  // still passed as prop for config
  const bindedContext = BindedContext(props, true);
  
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  function iconItem (item) { 
    if (item.Type === "LeisureCategory") {
      return (
        <Link key={`sidemenu-link-${item.Id}`} to={'/' + item.Name} className="side-menu-link" title={'index: '+item.Index}>
          <i className={`fa ${item.IconName} fa-fw w3-margin-right w3-text-theme`}></i>
        </Link>
      )
    } else if (item.Url !== "") {
        return (
          <a key={`sidemenu-icon-${item.Id}`} href={item.Url} target="_blank" rel="noreferrer" className="no-score">
           <i className={`fa ${item.IconName} fa-fw w3-margin-right w3-text-theme`}></i>
          </a>
        )
    }    
  };

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }
  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("menu with logo", context, page, widget, layout)}
      <div className="w3-container">
      <h4 className="w3-center hidden">{widget.DisplayName}</h4>
      <Link to={'/'}>
        <img src={logoUrl} alt="site title" className="w3-center logo-image" />
      </Link> 
      {/* <p className="w3-center"><img src="/w3images/avatar3.png" className="w3-circle w3-circle-side-avatar" alt="Avatar" /></p> */}
      <hr className="no-margin"/>
      <div className="side-menu-uppercase">
        {bindedContext.children?.filter(item => item.DisplayZone?.includes("menuitem")).map((child) => {
          console.log(child.Name);
          return (
          <div className="sidemenu-link" key={`sidemenu-${child.Id}`}>
            {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
            <Link key={`sidemenu-link-${child.Id}`} to={'/' + child.Name} className="side-menu-link" title={'index: '+child.Index}>
              {child.DisplayName}
            </Link>
          </div>
        )}
        )}
      </div>
      <hr className="no-margin"/>
        <div className="sidemenu-icons-wrapper">
          {bindedContext.children?.filter(item => item.DisplayZone?.includes("menuicon")).map((child) => {
            return iconItem(child);
          })}
        </div>
      </div>
      {}
    </div>
  );
}

export default MenuWithLogoWidget;