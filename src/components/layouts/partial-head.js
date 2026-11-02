import React from 'react';
import { Helmet } from 'react-helmet-async';
const defaultImage = require('../../images/logo.png');

// Helmet reconciles only its data-rh tags. Hosting may inject an unmarked
// description into the initial HTML; retire it once Helmet has written the
// resolved description, before the parent publishes its page view.
const replaceStaticDescription = () => {
  if (!document.head.querySelector('meta[name="description"][data-rh]')) return;
  document.head.querySelectorAll('meta[name="description" i]:not([data-rh])')
    .forEach(node => node.remove());
};

const CommonHelmet = ({ description, robots, pageTitle, pathname, noindex, includeCanonical = true }) => {
  // TODO: get og:image dynamically
  const dataPath = process.env.REACT_APP_DATA_PATH;
  const apiUrl = process.env.REACT_APP_API_URL;
  let logoPath = process.env.REACT_APP_LOGO_PATH;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  const appId = process.env.REACT_APP_FB_APPID;
  const siteHost = process.env.REACT_APP_SITE_HOST;
  
  const pageUrl = new URL(pathname, siteHost || window.location.origin).href;

  const robotsValue = noindex ? 'noindex' : robots;

  return (
    <Helmet defer={false} onChangeClientState={replaceStaticDescription}>

      <meta charset="utf-8" />
      <meta name="language" content="hu" />
      <meta name="description" content={description} />
      {robotsValue && <meta name="robots" content={robotsValue} />}
      {includeCanonical && <link rel="canonical" href={pageUrl} />}
      <meta property="fb:app_id" content={appId} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={logoUrl} />
      <meta property="og:image:width" content="460" />
      <meta property="og:image:height" content="154" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content="OG image for site" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default CommonHelmet;
