import { addComponentsByZone, addComponent } from '../utils/add-component';
import { Helmet } from 'react-helmet-async';
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export const LeisureSimpleLayout = (props) => {
  // const context = props.data;
  // const layout = props.page;
  // const widgets = props.widget;
  const {context, layout, widgets} = useSnStore((state) => state);
  console.log('%cleisure-simple layout', "font-size:16px;color:green", { props: props }, { context: context}, { layout: layout}, { widgets: widgets });
  
  const sideboxes = addComponentsByZone('widgets', 'side', null, null, widgets);
  console.log('sideboxes');
  console.log(sideboxes);

  const components = addComponentsByZone('widgets', 'content', null, null, widgets);
  console.log('components');
  console.log(components);

  // TODO: get og:image dynamically
  const apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let logoUrl = apiUrl + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  const appId = process.env.REACT_APP_FB_APPID || DATA.facebookappid;
  const siteHost = process.env.REACT_APP_SITE_HOST || DATA.siteHost;
  const dataPath = process.env.REACT_APP_DATA_PATH || DATA.dataPath;
  // const pagePath = window.location.pathname; // url path
  const pagePath = context.Path.replace(dataPath, ''); // widget context content path
  const pageUrl = siteHost + pagePath;    
  const pageTitle = (context.Id === context.Workspace.Id) ? `${context.DisplayName}` : `${context.Workspace.DisplayName} - ${context.DisplayName}`;

  // TODO: get description to context dynamically
  const description = "book movie tvseries manga anime games reviews hungarian"

  return (
    <div className="App w3-theme-l5">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="language" content="hu" />
          <meta name="description" content={description} />         
          <link rel="canonical" href={pageUrl} />
          <meta property="fb:app_id" content={appId} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={logoUrl} />
				</Helmet>
      
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-custom">
        {/* The Grid */}
        <div className="w3-row layout-container">
          {/* Left Column */}
          <div className="w3-col m2">
            {sideboxes}
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          <div className="w3-col m9 layout-middle">
            <div className="w3-row-padding w3-margin-bottom pagetemplate-sign">
              <div className="w3-col m12">
                <div className="w3-card w3-round w3-white">
                  <div className="w3-container w3-padding">
                    <b>Leisure Simple Layout</b>
                  </div>
                </div>
              </div>
            </div>
            {components}
          </div>
          {/* End Middle Column */}

          {/* Right Column */}
          {/* <div className="w3-col m2">
          </div> */}
          {/* End Right Column */}
        </div>
        {/* End Grid */}
      </div>
      
      {/* End Page Container */}

      {/* Footer */}
      <footer className="w3-container w3-theme-d5">
        <p>
          Powered by <a href="https://sensenet.com" target="_blank" rel="noreferrer">sensenet</a>, <a href="https://reactjs.org/" target="_blank" rel="noreferrer">react</a> and <a href="https://www.w3schools.com/w3css/default.asp" target="_blank" rel="noreferrer">w3.css</a>
        </p>
      </footer>
      {/* End Footer */}
    </div>
  );
}

export default LeisureSimpleLayout;
