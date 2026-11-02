import React, { useEffect } from 'react';
import ShowDebugInfo from "../utils/show-debuginfo"
import { useSnStore } from "../store/sn-store";

// Disqus Comments Plugin
// https://disqus.com/admin/install/platforms/universalcode/

export function DisqusCommentsWidget(props) {
  console.log('%cDisqusComments', "font-size:16px;color:blue", { props: props });
  const {context, page} = useSnStore((state) => state);
  let widget = props.widget;

  const shortname = process.env.REACT_APP_DISQUS_SHORTNAME;
  const pageUrl = window.location.href;
  const pageIdentifier = context?.Id || pageUrl; // Use content ID or URL as identifier

  useEffect(() => {
    const loadDisqus = () => {
      if (document.getElementById('disqus-sdk') || !shortname) {
        return;
      }

      // Configure Disqus
      window.disqus_config = function () {
        this.page.url = pageUrl;
        this.page.identifier = pageIdentifier;
        console.log('Disqus config set:', { url: pageUrl, identifier: pageIdentifier });
      };

      const script = document.createElement('script');
      script.id = 'disqus-sdk';
      script.src = `https://disqus.com/forums/${shortname}/embed.js`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Disqus script loaded successfully');
        if (window.DISQUS) {
          console.log('DISQUS object available');
        }
      };

      script.onerror = () => {
        console.error('Failed to load Disqus script');
      };

      document.body.appendChild(script);
    };

    loadDisqus();

    // Cleanup function to reset Disqus on unmount
    return () => {
      const disqusThread = document.getElementById('disqus_thread');
      if (disqusThread) {
        disqusThread.innerHTML = '';
      }
      const script = document.getElementById('disqus-sdk');
      if (script) {
        script.remove();
      }
    };
  }, [shortname, pageUrl, pageIdentifier]);

  return (
    <div className="w3-row-padding w3-margin-bottom full-width">
      <div className="w3-col m12">
        <div className="w3-card w3-round w3-white">
          <ShowDebugInfo title="disqus comment" context={context} currentPage={page} widget={widget} />
          <div className="w3-container w3-padding">
            <div className="disqus-comments w3-container w3-padding">
              <h3>Hozzászólások</h3>
              <small>{pageUrl}</small>
              {console.log('Disqus page URL:', pageUrl)}
              <div id="disqus_thread"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisqusCommentsWidget;