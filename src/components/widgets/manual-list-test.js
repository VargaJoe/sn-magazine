import React from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
import BindedContext from "../utils/context-binding"

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export function TestWidget(props) {
  console.log('test list widget');
  console.log(props);
  const layout = props.page;
  // let context = props.data;
  const widget = props.widget;
  
  // binded context could be result back with all widget variables contet, children, widget, layout
  // binded context withChildren should be set on widget content, not manual boolean variable
  const bindedContext = BindedContext(props, true);
  console.log('binded context: ', bindedContext);

  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
      {ShowDebugInfo("side menu with logo", bindedContext.content, layout, widget)}
      <div className="w3-container">
        <div>{bindedContext?.content?.DisplayName}</div>
        <div className="side-menu-uppercase">
          {console.log('itemCollection', bindedContext.children)}
          {bindedContext.children?.map((child) => {
            console.log(child.Name);
            return (
            <p key={`banner-${child.Id}`}>
              {/* <i className="fa fa-pencil fa-fw w3-margin-right w3-text-theme"></i>  */}
              <a key={`banner-link-${child.Id}`} href={child.Url} target="_blank" rel="noreferrer" className="side-menu-link" title={'index: '+child.Index}>
              <img src={(process.env.REACT_APP_API_URL || DATA.apiUrl) + child.Binary.__mediaresource.media_src} alt={child.DisplayName} className="banner-image"/>
              </a>
            </p>
          )}
          )}
        </div>
      </div>
    </div>
  );
}

export default TestWidget;