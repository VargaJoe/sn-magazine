import React from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export function BannerListWidget(props) {
  console.groupCollapsed('%cbannerList', "font-size:16px;color:green");
  console.log(props);
  const layout = props.page;
  let context = props.data;
  let widget = props.widget;
  const bindedContext = BindedContext(props, true);
  
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}


  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu with logo", context, layout, widget)}
      <div className="w3-container">
        <div className="side-menu-uppercase">
          {bindedContext.children?.map((child) => {
            return (
              <div className="banner-wrapper" key={`banner-${child.Id}`}>
                <a key={`banner-link-${child.Id}`} href={child.Url} target="_blank" className="side-menu-link" title={'index: '+child.Index} rel="noreferrer">
                <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + child.Binary.__mediaresource.media_src} alt={child.DisplayName} className="banner-image"/>
                </a>
              </div>
            )
          })}
        </div>
      </div>
      {console.groupEnd()}
    </div>
  );
}

export default BannerListWidget;