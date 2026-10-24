import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import CommonHelmet from './components/layouts/partial-head';
import { buildPageTitle } from './page-meta';

// PageWrapper supplies only the resolved context for the current navigation.
// Keep this instance mounted while loading so StrictMode/re-renders cannot
// replay a page view. A POP back to an earlier entry is still a new navigation.
export default function AnalyticsTracker({ context, pageType = 'content', pageTitle }) {
  const location = useLocation();
  const navigationState = useRef(null);
  const navigation = JSON.stringify([location.key, location.pathname, location.search, location.hash]);
  const title = pageTitle || buildPageTitle(context, process.env.REACT_APP_DATA_PATH);

  useLayoutEffect(() => {
    // Observe loading/failed navigations too: POP can reuse an earlier history
    // key even when the intervening page never became ready to publish.
    if (navigationState.current?.key !== navigation) {
      navigationState.current = { key: navigation, published: false };
    }
    if (!title) return;

    // One synchronous operation: even dataLayer.push observers see this title.
    document.title = title;
    if (navigationState.current.published) return;
    window.dataLayer = window.dataLayer || [];
    navigationState.current.published = true;
    window.dataLayer.push({
      event: 'react_page_view',
      page_title: document.title,
      page_path: location.pathname,
      page_type: pageType,
    });
  }, [navigation, location.pathname, title, pageType]);

  return title ? <CommonHelmet context={context} pageTitle={title} pathname={location.pathname}
    noindex={pageType !== 'content'} includeCanonical={pageType !== 'not_found'} /> : null;
}
