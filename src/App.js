// import "./App.css";
// import "./App-Custom.css";
import { Routes, Route } from "react-router-dom";
import SiteRoutes from "./navigation";
import { HelmetProvider } from "react-helmet-async";
import AnalyticsTracker from "./AnalyticsTracker";
import SitePresentationProvider from './presentation/site-presentation-provider';

function App() {
  const helmetContext = {};

  return (
    <HelmetProvider context={helmetContext}>
      <SitePresentationProvider>
        <AnalyticsTracker />
        <Routes>
          {SiteRoutes.public.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              exact={route.exact}
              element={<route.component />} />
          ))}
        </Routes>
      </SitePresentationProvider>
    </HelmetProvider>
  );
}

export default App;
