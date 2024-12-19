import React, { useEffect, useState, useRef } from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
// import BindedContext from "../utils/context-binding"
import { useSnStore } from "../store/sn-store";
const DATA = require('../../config.json');

export function FacebookCommentsWidget(props) {
  console.log('%cFbComments', "font-size:16px;color:green", { props: props });
  // const layout = props.page;
  // let context = props.data;
  const {context, page, layout} = useSnStore((state) => state);
  let widget = props.widget;  
  // const bindedContext = BindedContext(props, true);
  const fbCommentsRef = useRef(null);
  const [width, setWidth] = useState('');

  const appId = process.env.REACT_APP_FB_APPID || DATA.facebookappid;
  const siteHost = process.env.REACT_APP_SITE_HOST || DATA.siteHost;
  const dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  const pagePath = context.Path.replace(dataPath, '');
  const pageUrl = siteHost + pagePath;
  console.log('componentsize', fbCommentsRef?.current?.offsetWidth);

  useEffect(() => {
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0&appId=${appId}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    };

    loadFacebookSDK();
    if (fbCommentsRef.current) {
      setWidth(fbCommentsRef.current.offsetWidth - 40);
    }
  }, [appId]);

  useEffect(() => {
    if (window.FB && window.FB.XFBML && typeof window.FB.XFBML.parse === 'function') {
      window.FB.XFBML.parse();
    }
  });
  
  return (
    
      <div className="w3-col m12" style={{ width: '97%' }} ref={fbCommentsRef}>
        {ShowDebugInfo("facebook comment", context, page, widget, layout)}
        <div className="w3-card w3-round w3-white">
          <div className="fb-comment w3-container w3-padding article-full">
            <h3>Hozzászólások a "{pageUrl}" oldalhoz.</h3>
            <div className="fb-comments" data-href={pageUrl} data-width={width} data-numposts="5"></div>
          </div>
        </div>
      </div>
    
  );
}

export default FacebookCommentsWidget;