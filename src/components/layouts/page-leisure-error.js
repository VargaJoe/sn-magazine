import { addComponent } from '../utils/add-component';
import { Helmet } from 'react-helmet-async';
import { useSnStore } from "../store/sn-store";

const DATA = require('../../config.json');
const defaultImage = require('../../images/logo.png');

export const LeisureErrorLayout = (props) => {
  // const context = props.data;
  // const layout = props.page;
  // const widgets = props.widget;
  const {context, layout, widgets} = useSnStore((state) => state);
  console.log('%cleisure-error layout', "font-size:16px;color:green", { props: props }, { context: context}, { layout: layout}, { widgets: widgets });
  
  const components = addComponent('content', 'auto', 'missing', 1, context);
  console.log('leisure-error layout components', components);
  
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
  let logoUrl = apiUrl + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  // const pageTitle = (context.Id === context.Workspace.Id) ? `${context.DisplayName}` : `${context.Workspace.DisplayName} - ${context.DisplayName}`;
  const pageTitle = 'Not found';

  return (
    <div className="App w3-theme-l5">
        <Helmet>
					<meta charSet="utf-8" />
					<title>{pageTitle}</title>
				</Helmet>

      
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-custom">
        {/* The Grid */}
        <div className="w3-row">
          {/* Left Column */}
          <div className="w3-col m2">
            
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          <div className="w3-col m9">
            <div className="w3-row-padding w3-margin-bottom pagetemplate-sign">
              <div className="w3-col m12">
                <div className="w3-card w3-round w3-white">
                  <div className="w3-container w3-padding">
                    <b>VANILLA</b>
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
      <footer className="w3-container w3-theme-d3 w3-padding-16 hidden">
        <h5>Footer</h5>
      </footer>

      <footer className="w3-container w3-theme-d5">
        <p>
          Powered by <a href="https://sensenet.com" target="_blank" rel="noreferrer">sensenet</a>, <a href="https://reactjs.org/" target="_blank" rel="noreferrer">react</a> and <a href="https://www.w3schools.com/w3css/default.asp" target="_blank" rel="noreferrer">w3.css</a>
        </p>
      </footer>
      {/* End Footer */}
    </div>
  );
}

export default LeisureErrorLayout;
