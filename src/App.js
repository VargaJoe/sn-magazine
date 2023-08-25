import "./App.css";
import "./App-Custom.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SiteRoutes from "./navigation";
import { HelmetProvider } from "react-helmet-async";

function App() {
  const helmetContext = {};

  return (
    <BrowserRouter>
      <HelmetProvider context={helmetContext}>
        <Routes>
          {SiteRoutes.public.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              exact={route.exact}
              element={<route.component />}
            />
          ))}
        </Routes>
      </HelmetProvider>
    </BrowserRouter>
  );
}

export default App;
