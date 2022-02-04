import "./App.css";
import "./App-Custom.css";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import SiteRoutes from "./navigation";
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
    </BrowserRouter>
  );
}

export default App;
