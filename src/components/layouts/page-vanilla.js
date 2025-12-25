// import { SideMenu } from "../side-menu";
import { CachedComponentsByZone, addComponent } from '../utils/add-component';
import { Link } from 'react-router-dom';
import { useSnStore } from "../store/sn-store";
import React from 'react';

export const VanillaPageTemplate = React.memo((props) => {
  const { context, widgets } = useSnStore((state) => state);

  // console.log('%cvanilla layout render', "font-size:16px;color:green", { contextId: context?.Id, widgetsCount: widgets?.length });
  
  if (!widgets || !Array.isArray(widgets)) {
    return <div>Loading layout...</div>;
  }

  return (
    <div className="App w3-theme-l5">
      <div className="w3-top">
        <div className="w3-bar w3-theme-d2 w3-left-align w3-large">
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-medium w3-hide-large w3-right w3-padding-large w3-hover-white w3-large w3-theme-d2"
            aria-label="Menu"
          >
            <i className="fa fa-bars"></i>
          </a>
          <Link to={'/'}
            className="w3-bar-item w3-button w3-padding-large w3-theme-d4"
          >
            <i className="fa fa-home w3-margin-right"></i>Logo
          </Link>        
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="News"
            aria-label="News"
          >
            <i className="fa fa-globe"></i>
          </a>
            <a
           href="mailto:info@sensenet.com"
           className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
           title="Messages"
           aria-label="Messages"
         >
           <i className="fa fa-envelope"></i>
         </a>
        </div>
      </div>

      <div
        id="navDemo"
        className="w3-bar-block w3-theme-d2 w3-hide w3-hide-large w3-hide-medium w3-large"
      >
      </div>
      
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-vanilla">
        {/* The Grid */}
        <div className="w3-row">
          {/* Left Column */}
          <div className="w3-col m3">
            {/* <SideMenu />
            <br/> */}
            <CachedComponentsByZone type="widgets" zone="side" widgets={widgets} context={context} />
            {addComponent('widgets', 'auto', 'widgetlogin', 1, null)}
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          <div className="w3-col m7">
            <div className="w3-row-padding w3-margin-bottom pagetemplate-sign">
              <div className="w3-col m12">
                <div className="w3-card w3-round w3-white">
                  <div className="w3-container w3-padding">
                    <b>VANILLA</b>
                  </div>
                </div>
              </div>
            </div>
            <CachedComponentsByZone type="widgets" zone="content" widgets={widgets} context={context} />
          </div>
          {/* End Middle Column */}
        </div>
        {/* End Grid */}
      </div>
      
      {/* End Page Container */}

      {/* Footer */}
      <footer className="w3-container w3-theme-d5">
        <p>
          Powered by{" "}
          <a href="https://www.w3schools.com/w3css/default.asp" target="_blank" rel="noreferrer">
            w3.css
          </a>
        </p>
      </footer>
      {/* End Footer */}
    </div>
  );
});

export default VanillaPageTemplate;
