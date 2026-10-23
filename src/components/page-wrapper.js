import React, { useEffect, useRef, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useLocation } from 'react-router-dom';
import { addComponent, addLayout } from './utils/add-component';
import { useSnStore } from './store/sn-store';
import AnalyticsTracker from '../AnalyticsTracker';
import { maintenanceTemplate } from '../configuration';
import { loadWithTimeout, pageTypeForError } from '../page-load';
import { errorPageData, siteForContext } from '../error-page';

// Preserve the existing Context -> inherited Layout (Page) query resolution.
function pageQuery(context, layoutContentType, widgetContentType) {
  if (context.Type === layoutContentType) {
    return `Path:'${context.Path}' OR TypeIs:${widgetContentType} AND InFolder:'${context.Path}' AND Hidden:0`;
  }
  const folders = [];
  let path = '';
  for (const part of context.Path.split('/').filter(Boolean)) {
    path += `/${part}`;
    folders.push(`'${path}/(layout)'`);
  }
  folders.reverse();
  const base = `'${process.env.REACT_APP_PAGECONTAINER_PATH}'`;
  if (!folders.includes(base)) folders.push(base);
  return `
    (
      Name:This AND TypeIs:${layoutContentType} AND Path:'${context.Path}/(layout)/This'
    )
    OR
    (
      (
        (Name:'${context.Type}' AND TypeIs:${layoutContentType})
        OR TypeIs:${widgetContentType}
      )
      AND InTree:(${folders.join(' ')})
      AND Hidden:0
    )`;
}

const PageWrapper = React.memo(() => {
  const location = useLocation();
  const repo = useRepository();
  const { setContext, setLayout, setPage, setWidgets } = useSnStore();
  const [resolved, setResolved] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const requestGeneration = useRef(0);
  const knownSite = useRef(null);
  const navigationKey = JSON.stringify([location.key, location.pathname, location.search, location.hash]);
  // Gate rendering immediately, before the navigation effect starts its loads.
  const current = resolved?.navigationKey === navigationKey && resolved?.repo === repo &&
    resolved?.retryAttempt === retryAttempt ? resolved : null;
  const root = process.env.REACT_APP_DATA_PATH?.replace(/\/+$/, '');
  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || 'Layout';
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || 'Widget';

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    let cancelled = false;
    const isCurrent = () => !cancelled && requestGeneration.current === generation;
    setResolved(null);
    setContext(null);
    setPage(null);
    setWidgets(null);
    if (knownSite.current?.repo !== repo || knownSite.current?.root !== root) knownSite.current = null;

    const showError = async pageType => {
      let site = knownSite.current?.site;
      // A missing route has no expanded Workspace. Resolve branding and the
      // existing home menu from this site's root, never a hostname registry.
      // During an outage use the last Workspace or configured maintenance name.
      if (pageType === 'not_found') {
        try {
          const result = await loadWithTimeout(repo, { idOrPath: root,
            oDataOptions: { select: 'all', expand: ['Workspace', 'Children'], enablelifespanfilter: 'on' },
          }, controller.signal);
          if (!isCurrent()) return;
          if (result?.d?.DisplayName) {
            site = result.d;
            knownSite.current = { repo, root, site };
          }
        } catch (error) {
          if (!isCurrent()) return;
          // The original request still proves absence even if menu loading fails.
        }
      }
      if (!isCurrent()) return;
      const data = errorPageData(pageType, site, root, () => setRetryAttempt(value => value + 1));
      setResolved({ navigationKey, repo, retryAttempt, context: null, page: null,
        pageType, pageTitle: data.pageTitle,
        component: addComponent('layouts', 'page', pageType === 'not_found' ? 'not-found' : maintenanceTemplate, 'page-status', data) });
    };

    const load = async () => {
      let context;
      try {
        const path = location.pathname.replace(/\(/g, '%28').replace(/\)/g, '%29');
        const result = await loadWithTimeout(repo, {
          idOrPath: `${root}${path === '/' ? '' : path}`,
          oDataOptions: { select: 'all', expand: 'Workspace' },
        }, controller.signal);
        if (!isCurrent()) return;
        context = result?.d;
        if (context == null || (typeof context === 'object' && Object.keys(context).length === 0) ||
            (Array.isArray(context?.results) && context.results.length === 0)) {
          await showError('not_found');
          return;
        }
        if (!context?.Type || typeof context.Path !== 'string') {
          throw new Error('Invalid context was returned for the requested page');
        }
        const site = siteForContext(context, root);
        if (site?.DisplayName) knownSite.current = { repo, root, site };
        setContext(context);
      } catch (error) {
        if (!isCurrent()) return;
        const pageType = pageTypeForError(error);
        if (pageType === 'error') console.error('Error loading page context: ', error);
        await showError(pageType);
        return;
      }

      let page = null;
      let widgets;
      try {
        const options = {
          path: '/Root/Content',
          oDataOptions: {
            query: pageQuery(context, layoutContentType, widgetContentType),
            expand: ['CustomRoot'],
            orderby: ['Index'],
            select: 'all',
            enablelifespanfilter: 'on',
            enableautofilters: 'off',
          },
        };
        const result = await repo.loadCollection(options);
        if (!isCurrent()) return;
        const contents = Array.isArray(result?.d?.results) ? result.d.results : [];
        page = contents.filter(content => content.Type === layoutContentType)
          .sort((a, b) => a.Depth < b.Depth ? 1 : -1)[0] || null;
        widgets = page ? contents.filter(content => content.ParentId === page.Id) : undefined;
      } catch (error) {
        if (!isCurrent()) return;
        console.error('error on loading page: ', error);
      }
      if (!isCurrent()) return;
      setPage(page);
      setWidgets(widgets);
      const selected = !page?.PageTemplate ? null :
        addComponent('layouts', 'page', page.PageTemplate, `page-${page.PageTemplate}`, null, null, null);
      const component = selected || addLayout(context, setLayout);
      setResolved({ navigationKey, repo, retryAttempt, context, page, component, pageType: 'content' });
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [repo, root, location.pathname, navigationKey, retryAttempt, layoutContentType, widgetContentType, setContext, setLayout, setPage, setWidgets]);

  return (
    <>
      <AnalyticsTracker context={current?.context} pageType={current?.pageType} pageTitle={current?.pageTitle} />
      {current && (
        <React.Suspense fallback={null}>
          {current.component}
        </React.Suspense>
      )}
    </>
  );
});

export default PageWrapper;
