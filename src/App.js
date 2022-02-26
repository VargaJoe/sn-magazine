import "./App.css";
import "./App-Custom.css";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import SiteRoutes from "./navigation";
const DATA = require('./config.json');
const defaultImage = require('./images/logo.png');

function App() {
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
