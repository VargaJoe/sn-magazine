import { maintenanceSiteName, maintenanceTitle, maintenanceText, maintenanceEmail } from '../../configuration';


export const MaintenanceLayout = (props) => {
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
          <a
            href="/"
            className="w3-bar-item w3-button w3-padding-large w3-theme-d4"
          >
            <i className="fa fa-home w3-margin-right"></i>{maintenanceSiteName}
          </a>
          {/* <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="News"
            aria-label="News"
          >
            <i className="fa fa-globe"></i>
          </a> */}
         {maintenanceEmail && maintenanceEmail.trim() ? (
            <a
              href={`mailto:${maintenanceEmail}`}
              className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
              title="Messages"
              aria-label="Messages"
            >
              <i className="fa fa-envelope"></i>
            </a>
          ) : null}
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-right w3-padding-large w3-hover-white"
            title="My Account"
            aria-label="My Account"
          >
            
          </a>
        </div>
      </div>

      <div
        id="navDemo"
        className="w3-bar-block w3-theme-d2 w3-hide w3-hide-large w3-hide-medium w3-large"
      >
      </div>

      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom pagetemplate-wide">
        {/* The Grid */}
        <div className="w3-row w3-margin">
          {/* Middle Column */}
          <div className="w3-col m12 w3-center">
            <div style={{maxWidth: '66.666%', margin: '0 auto'}}>
              <div className="w3-row-padding w3-margin-top">
                  <div className="w3-col m12">
                    <div className="w3-card w3-round w3-white">
                      <div className="w3-container w3-padding" style={{textAlign: 'center'}}>
                        <h1>{maintenanceTitle}</h1>
                        <div dangerouslySetInnerHTML={{__html: maintenanceText}} />
                      </div>
                    </div>
                  </div>
                </div>
            </div>
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
}

export default MaintenanceLayout;