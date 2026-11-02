import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import CommonHelmet from './components/layouts/partial-head';
import { buildPageMetadata, publicationTime } from './page-meta';

// PageWrapper supplies the resolved context and Page for the current navigation.
// Keep this instance mounted while loading so StrictMode/re-renders cannot
// replay a page view. A POP back to an earlier entry is still a new navigation.
export default function AnalyticsTracker({ context, page, pageType = 'content', pageTitle }) {
  const location = useLocation();
  const navigationState = useRef(null);
  const navigation = JSON.stringify([location.key, location.pathname, location.search, location.hash]);
  const [, refreshPublication] = useReducer(value => value + 1, 0);
  const now = Date.now();
  const publishTime = publicationTime(context?.PublishDate);
  const scheduled = pageType === 'content' && publishTime !== null && publishTime > now;
  const metadata = buildPageMetadata(context, page, process.env.REACT_APP_DATA_PATH, now);
  const title = pageTitle || metadata.title;

  useEffect(() => {
    if (!scheduled) return;
    let timer;
    const checkPublication = () => {
      const remaining = publishTime - Date.now();
      if (remaining > 0) {
        // Browser timers overflow beyond ~25 days; recheck long schedules.
        timer = setTimeout(checkPublication, Math.min(remaining, 2147483647));
      } else {
        refreshPublication();
      }
    };
    checkPublication();
    return () => clearTimeout(timer);
  }, [publishTime, scheduled]);

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

  return title ? <CommonHelmet description={metadata.description} robots={metadata.robots}
    pageTitle={title} pathname={location.pathname}
    noindex={pageType !== 'content'} includeCanonical={pageType !== 'not_found'} /> : null;
}
