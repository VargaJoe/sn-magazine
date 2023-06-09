import "./App.css";
import "./App-Custom.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SiteRoutes from "./navigation";

function App() {
  return (
    <BrowserRouter>
     <Routes>
        {SiteRoutes.public.map((route, index) => (
          <Route
            key={index}
            path={route.path}
            exact={route.exact}
            element={<route.component/>}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
