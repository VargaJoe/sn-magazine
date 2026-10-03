import React, { createContext, useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { loadPresentation } from './site-presentation';

const SitePresentationContext = createContext(null);
export const useSitePresentation = () => useContext(SitePresentationContext);

export default function SitePresentationProvider({
  children,
  repositoryUrl = process.env.REACT_APP_API_URL,
  sitePath = process.env.REACT_APP_DATA_PATH,
  path = process.env.REACT_APP_PRESENTATION_PATH,
}) {
  const [loaded, setLoaded] = useState(null);
  // Avoid keeping another site's CSS/layout while its configuration is loading.
  const key = `${repositoryUrl}|${sitePath}|${path || ''}`;
  const presentation = loaded?.key === key ? loaded.value : null;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    if (repositoryUrl && sitePath) {
      loadPresentation({ repositoryUrl, sitePath, path, signal: controller.signal })
        .then(value => {
          if (!controller.signal.aborted) setLoaded({ key, value });
        })
        .catch(error => {
          if (!controller.signal.aborted) {
            console.warn('Site presentation unavailable; keeping the built-in layout.', error.message);
            setLoaded({ key, value: null });
          }
        })
        .finally(() => clearTimeout(timeout));
    } else {
      clearTimeout(timeout);
    }
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [repositoryUrl, sitePath, path, key]);

  return (
    <SitePresentationContext.Provider value={presentation}>
      <Helmet>
        {(presentation?.stylesheets || []).map(href => (
          <link key={href} rel="stylesheet" href={href} data-sn-presentation="true" />
        ))}
      </Helmet>
      {children}
    </SitePresentationContext.Provider>
  );
}
