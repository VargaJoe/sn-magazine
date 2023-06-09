import "./App.css";
import "./App-Custom.css";
import { Routes, Route } from "react-router-dom";
import SiteRoutes from "./navigation";
import { HelmetProvider } from 'react-helmet-async';

function App() {
  const helmetContext = {};

  return (
    <HelmetProvider context={helmetContext}>
      
        <Routes>
          {SiteRoutes.public.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              exact={route.exact}
              element={<route.component />} />
          ))}
        </Routes>
      
    </HelmetProvider>
  );
}

export default App;
