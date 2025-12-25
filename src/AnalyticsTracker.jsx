import { useEffect } from "react";
import { useLocation } from "react-router-dom";


export default function AnalyticsTracker() {
  const location = useLocation();


  useEffect(() => {
    // Avoid errors in environments where GTM is not loaded
    if (!window.dataLayer) return;


    window.dataLayer.push({
      event: "react_page_view",
      page_title: document.title,
      page_path: location.pathname + location.search,
    });
  }, [location]);


  return null;
}