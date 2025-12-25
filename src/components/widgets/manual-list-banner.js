import React from 'react';
import useBindedContext from "../utils/context-binding"
import ShowDebugInfo from "../utils/show-debuginfo";
import deepEqual from "../utils/deep-equal";

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

const BannerListWidget = React.memo((props) => {
  console.log('%cBannerList', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const bindedContext = useBindedContext(props, true);
  
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  if (bindedContext.loading) {
    return (
      <div className="w3-card w3-round w3-white w3-margin-bottom">
        <div className="w3-container">
          <div className="side-menu-uppercase">
            Loading banners...
          </div>
        </div>
      </div>
    );
  }

  // if (itemCollection?.length === 0) {
  //   return (<div>loading</div>)
  // }

  return (
    <div className="w3-card w3-round w3-white w3-margin-bottom">
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
      <ShowDebugInfo title="BannerList" context={bindedContext.context} currentPage={props.page} widget={props.widget} />
    </div>
  );
}, deepEqual);

export default BannerListWidget;