import "./App.css";
import { SideMenu } from "./components/side-menu";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import SiteRoutes from "./navigation";
import { Link } from 'react-router-dom';
const DATA = require('./config.json');
const defaultImage = require('./images/logo.png');

function App() {
  let logoPath = process.env.REACT_APP_LOGO_PATH || DATA.siteLogo;
  let apiUrl = DATA.apiUrl;
  let logoUrl = apiUrl + logoPath;
		if (logoPath === undefined || logoUrl === apiUrl) {
			logoUrl = defaultImage;
		}

  return (
    <BrowserRouter>
    <div className="App w3-theme-l5">
      <div className="w3-top">
        <div className="w3-bar w3-theme-d2 w3-left-align w3-large">
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-medium w3-hide-large w3-right w3-padding-large w3-hover-white w3-large w3-theme-d2"
          >
            <i className="fa fa-bars"></i>
          </a>
          <Link to={'/'}>
            <img src={logoUrl} height='52px' alt="site title" className="w3-bar-item w3-button w3-padding-large w3-theme-d4" />
          </Link> 
          {/* <a
            href="/"
            className="w3-bar-item w3-button w3-padding-large w3-theme-d4"            
          >
            <i className="fa fa-home w3-margin-right"></i>Logo
            
          </a> */}
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="News"
          >
            <i className="fa fa-globe"></i>
          </a>
          <a
            href="/"
            className="w3-bar-item w3-button w3-hide-small w3-padding-large w3-hover-white"
            title="Send Message"
          >
            <i className="fa fa-envelope"></i>
          </a>
        </div>
      </div>

      <div
        id="navDemo"
        className="w3-bar-block w3-theme-d2 w3-hide w3-hide-large w3-hide-medium w3-large"
      >
        {/* <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 1</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 2</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">Link 3</a>
  <a href="#" className="w3-bar-item w3-button w3-padding-large">My Profile</a> */}
      </div>
      {/* <BrowserRouter> */}
      {/* Page Container */}
      <div className="w3-container w3-content w3-content-custom">        
        {/* The Grid */}
        <div className="w3-row">
          {/* Left Column */}
          <div className="w3-col m3">
            <SideMenu />
            <br/>
          </div>
          
          {/* End Left Column */}

          {/* Middle Column */}
          {/* <div className="w3-col m7"> */}
              <Switch>
                {SiteRoutes.public.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    exact={route.exact}
                    component={route.component}
                  />
                ))}
              </Switch>
          {/* </div> */}
          {/* End Middle Column */}

          {/* Right Column */}
          {/* <div className="w3-col m2">
            <SideReviews />
            <SideTranslations />
          </div> */}
          {/* End Right Column */}
        </div>
        {/* End Grid */}
      </div>
      {/* </BrowserRouter> */}
      {/* End Page Container */}

      {/* Footer */}
      <footer className="w3-container w3-theme-d3 w3-padding-16">
        <h5>Footer</h5>
      </footer>

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
    </BrowserRouter>
  );
}

export default App;
