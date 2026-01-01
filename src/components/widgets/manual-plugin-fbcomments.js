import React, { useEffect } from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
// import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";

// Facebook Comments Plugin
// https://developers.facebook.com/docs/plugins/comments

export function FacebookCommentsWidget(props) {
  console.log('%cFbComments', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;  
  // const bindedContext = BindedContext(props, true);

  const appId = process.env.REACT_APP_FB_APPID;
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
        console.log('Facebook SDK loaded successfully');
        if (window.FB && window.FB.XFBML && typeof window.FB.XFBML.parse === 'function') {
          window.FB.XFBML.parse();
          console.log('FB.XFBML.parse() called');
        } else {
          console.error('FB.XFBML.parse not available after SDK load');
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
          <ShowDebugInfo title="facebook comment" context={context} currentPage={page} widget={widget} />
          <div className="w3-container w3-padding">
            <div className="fb-comments w3-container w3-padding">
              <h3>Hozzászólások</h3>
              <small>{window.location.href}</small>
              {console.log('Facebook comments data-href:', window.location.href)}
              <div className="fb-comments" data-href={window.location.href} data-width="100%" data-numposts="5" data-order-by="reverse_time" data-lazy></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacebookCommentsWidget;