import React, { useEffect } from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
// import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";
const DATA = require('../../config.json');

// Facebook Comments Plugin
// https://developers.facebook.com/docs/plugins/comments

export function FacebookCommentsWidget(props) {
  console.log('%cFbComments', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;  
  // const bindedContext = BindedContext(props, true);

  const appId = process.env.REACT_APP_FB_APPID || DATA.facebookappid;
  // const siteHost = process.env.REACT_APP_SITE_HOST || DATA.siteHost;
  // const dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  // const pagePath = context.Path.replace(dataPath, ''); // url context content path
  // const pagePath = bindedContext.contextPath?.replace(dataPath, ''); // widget context content path
  
  useEffect(() => {
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk') || !appId) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = `https://connect.facebook.net/hu_HU/sdk.js#xfbml=1&version=v22.0&appId=${appId}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        if (window.FB && window.FB.XFBML && typeof window.FB.XFBML.parse === 'function') {
          window.FB.XFBML.parse();
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load Facebook SDK');
      };
      
      document.body.appendChild(script);
    };

    loadFacebookSDK();
  }, [appId]);

  return (
    <div className="w3-row-padding w3-margin-bottom full-width">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
          {ShowDebugInfo("facebook comment", context, page, widget, layout)}
          <div className="w3-container w3-padding">
            <div className="fb-comments w3-container w3-padding">
              <h3>Hozzászólások</h3>
              <small>{window.location.href}</small>
              <div className="fb-comments" data-href={window.location.href} data-width="100%" data-numposts="5" data-order-by="reverse_time" data-lazy></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacebookCommentsWidget;