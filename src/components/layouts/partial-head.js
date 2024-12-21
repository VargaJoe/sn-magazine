import React from 'react';
import { Helmet } from 'react-helmet-async';
const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

const CommonHelmet = ({ context }) => {
  // TODO: get og:image dynamically
  const dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  const apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.ogimage;
  let logoUrl = apiUrl + dataPath + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  const appId = process.env.REACT_APP_FB_APPID || DATA.facebookappid;
  const siteHost = process.env.REACT_APP_SITE_HOST || DATA.siteHost;
  
  // const pagePath = window.location.pathname; // url path
  const pagePath = context.Path.replace(dataPath, ''); // widget context content path
  const pageUrl = siteHost + pagePath;    
  const pageTitle = (context.Id === context.Workspace.Id) ? `${context.DisplayName}` : `${context.Workspace.DisplayName} - ${context.DisplayName}`;

  // TODO: get description to context dynamically
  const description = "book movie tvseries manga anime games reviews hungarian"


  return (
    <Helmet>
      <meta property="og:image" content={logoUrl} />
      {/* TODO: get og:image width and height dynamically */}
      <meta property="og:image:width" content="460" />
      <meta property="og:image:height" content="154" />

      <title>{pageTitle}</title>
      <meta name="language" content="hu" />
      <meta name="description" content={description} />
      <link rel="canonical" href={pageUrl} />
      <meta property="fb:app_id" content={appId} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />      
      <meta charset="utf-8" />
      <meta name="description" content="Web site created using create-react-app" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default CommonHelmet;