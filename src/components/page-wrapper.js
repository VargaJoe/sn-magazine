import React, { useEffect, useRef, useState } from 'react';
import { useRepository } from '@sensenet/hooks-react';
import { useLocation } from 'react-router-dom';
import { addComponent, addLayout } from './utils/add-component';
import { useSnStore } from './store/sn-store';
import CommonHelmet from './layouts/partial-head';
import PageStylesheets from '../presentation/page-stylesheets';
import { maintenanceTemplate } from '../configuration';

function isStylesheetsSchemaMissing(error) {
  const status = error?.statusCode ?? error?.response?.status;
  if (status !== undefined && status !== 400 && status !== 500) return false;
  const message = error?.body?.error?.message?.value || error?.message || '';
  return /\b(?:unknown|unrecognized|undefined|nonexistent)\s+(?:field|property)(?:\s+name)?\s*[:=]?\s*['"]?Stylesheets\b/i.test(message) ||
    /\b(?:field|property)\s*['"]?Stylesheets['"]?\s+(?:does not exist|was not found|is not (?:found|defined)|not found|not defined)\b/i.test(message) ||
    /\bStylesheets['"]?\s+(?:field|property)\s+(?:does not exist|was not found|is not (?:found|defined)|not found|not defined)\b/i.test(message);
}

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
  const requestGeneration = useRef(0);
  const navigationKey = `${location.key}|${location.pathname}`;
  // Gate rendering immediately, before the navigation effect starts its loads.
  const current = resolved?.navigationKey === navigationKey && resolved?.repo === repo ? resolved : null;
  const layoutContentType = process.env.REACT_APP_LAYOUT_TYPE || 'Layout';
  const widgetContentType = process.env.REACT_APP_WIDGET_TYPE || 'Widget';

  useEffect(() => {
    const generation = ++requestGeneration.current;
    let cancelled = false;
    const isCurrent = () => !cancelled && requestGeneration.current === generation;
    setResolved(null);
    setContext(null);
    setPage(null);
    setWidgets(null);

    const load = async () => {
      let context;
      try {
        const path = location.pathname.replace(/\(/g, '%28').replace(/\)/g, '%29');
        const result = await repo.load({
          idOrPath: `${process.env.REACT_APP_DATA_PATH}/${path}`,
          oDataOptions: { select: 'all', expand: 'Workspace' },
        });
        if (!isCurrent()) return;
        context = result?.d;
        if (!context?.Type || typeof context.Path !== 'string') {
          throw new Error('No context was returned for the requested page');
        }
        setContext(context);
      } catch (error) {
        if (!isCurrent()) return;
        console.error('Connection refused on loading page: ', error);
        setResolved({ navigationKey, repo, context: null, page: null,
          component: addComponent('layouts', 'page', maintenanceTemplate, 666) });
        return;
      }

      let page = null;
      let widgets;
      try {
        const options = {
          path: '/Root/Content',
          oDataOptions: {
            query: pageQuery(context, layoutContentType, widgetContentType),
            expand: ['CustomRoot', 'Stylesheets'],
            orderby: ['Index'],
            select: 'all',
            enablelifespanfilter: 'on',
            enableautofilters: 'off',
          },
        };
        let result;
        try {
          result = await repo.loadCollection(options);
        } catch (error) {
          if (!isCurrent()) return;
          if (!isStylesheetsSchemaMissing(error)) throw error;
          // Existing repositories may still have the original Layout CTD.
          result = await repo.loadCollection({ ...options,
            oDataOptions: { ...options.oDataOptions, expand: ['CustomRoot'] } });
        }
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
      setResolved({ navigationKey, repo, context, page, component });
    };
    load();
    return () => { cancelled = true; };
  }, [repo, location.pathname, navigationKey, layoutContentType, widgetContentType, setContext, setLayout, setPage, setWidgets]);

  return (
    <>
      <PageStylesheets page={current?.page} repositoryUrl={process.env.REACT_APP_API_URL} />
      {current && (
        <React.Suspense fallback={null}>
          {current.context && <CommonHelmet context={current.context} />}
          {current.component}
        </React.Suspense>
      )}
    </>
  );
});

export default PageWrapper;
