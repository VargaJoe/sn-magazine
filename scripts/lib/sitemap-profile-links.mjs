// These list views render an internal generic card for author biographies.
const LINK_LISTS = new Set(['list-news', 'list-news-third', 'list-review']);
const ZONES = {
  wide: ['content'], double: ['side', 'content', 'right'],
  vanilla: ['side', 'content'], mirror: ['content', 'side'],
  'leisure-simple': ['side', 'content'], explore: ['side', 'content'],
  'leisure-simple-login': ['side', 'content'],
};
const first = value => Array.isArray(value) ? value[0] : undefined;
const parent = path => path.slice(0, path.lastIndexOf('/'));
const within = (path, root) => typeof path === 'string' && (path === root || path.startsWith(`${root}/`));
const hidden = value => value === true || value === 1 || ['true', '1'].includes(String(value).trim().toLowerCase());
const quote = value => JSON.stringify(value);
const blocked = (path, hiddenPaths) => {
  for (let current = path; current; current = parent(current)) if (hiddenPaths.has(current)) return true;
  return false;
};

function layoutFolders(path, base) {
  const folders = new Set([base]);
  for (let current = path; current; current = parent(current)) folders.add(`${current}/(layout)`);
  return folders;
}

// Remove ordering only outside quoted terms. A window or an unfamiliar directive
// cannot prove links after intersecting profile IDs, so decline that widget.
function listFilter(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return null;
  let filter = ''; let quoted = ''; let escaped = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { filter += char; escaped = false; continue; }
    if (char === '\\') { filter += char; escaped = true; continue; }
    if (quoted) { filter += char; if (char === quoted) quoted = ''; continue; }
    if (char === '"' || char === "'") { quoted = char; filter += char; continue; }
    if (char === '.' && (i === 0 || /\s|[()]/.test(value[i - 1]))) {
      const directive = /^\.([A-Z]+):([^\s()]+)/i.exec(value.slice(i));
      if (directive) {
        if (!['SORT', 'REVERSESORT'].includes(directive[1].toUpperCase()) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(directive[2])) return null;
        i += directive[0].length - 1; filter += ' '; continue;
      }
      if (/^\.[A-Z]+\b/i.test(value.slice(i))) return null;
    }
    filter += char;
  }
  return quoted || escaped ? null : filter.trim();
}

function boundList(widget, context, root) {
  const binding = first(widget.ContextBinding);
  let bound = context.Path;
  let type = context.Type;
  if (binding === 'customroot') {
    bound = widget.CustomRoot?.Path; type = widget.CustomRoot?.Type;
  } else if (binding && binding !== 'currentcontext') return null;
  if (!within(bound, root) || typeof type !== 'string' || type === 'SmartFolder') return null;
  // Relative contexts can resolve to SmartFolders with a different saved query.
  if (widget.RelativePath) return null;
  // Match use-list-sorting's transformation before checking the effective query.
  const value = widget.ClientComponent === 'list-review' && typeof widget.ContentQuery === 'string' ?
    widget.ContentQuery.replace(/\.SORT:[^\s]+/g, '').replace(/\.REVERSESORT:[^\s]+/g, '').trim() : widget.ContentQuery;
  const filter = listFilter(value);
  if (filter === null) return null;
  const level = first(widget.ChildrenLevel);
  // Deep queries and Workspace bindings require their actual collection context;
  // do not infer them from REACT_APP_DATA_PATH.
  if (level && level !== 'child') return null;
  return { bound, expression: `+InFolder:${quote(bound)}${filter ? ` +(${filter})` : ''}` };
}

/** Prove undated profile links through resolved, rendered menu/home list widgets.
 * Unknown views, deep/Workspace bindings, SmartFolders, relative contexts and windowed queries produce no
 * proof; failures/malformed responses in a needed query abort the generation.
 */
export async function discoverProfileLinks({ env, configuration, contexts, candidates, hiddenPaths }, query) {
  const links = new Map();
  if (!candidates.length || !contexts.length) return links;
  const layoutType = env.REACT_APP_LAYOUT_TYPE || 'Layout';
  const base = env.REACT_APP_PAGECONTAINER_PATH;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(layoutType) || typeof base !== 'string' ||
      !base.startsWith('/') || base.split('/').slice(1).some(x => !x || x === '.' || x === '..' || /[\\\x00-\x1f?#%]/.test(x))) {
    throw new Error('Profile link discovery requires valid existing layout configuration');
  }
  const folders = new Map(contexts.map(context => [context.Path, layoutFolders(context.Path, base)]));
  const allFolders = [...new Set([...folders.values()].flatMap(value => [...value]))];
  const direct = contexts.filter(context => context.Type === layoutType).map(context => quote(context.Path));
  const layouts = await query(`+TypeIs:${layoutType} +(InTree:(${allFolders.map(quote).join(' ')})${direct.length ? ` Path:(${direct.join(' ')})` : ''})`,
    'Id,Path,Name,Type,Hidden,PageTemplate');
  const pages = contexts.map(context => {
    if (context.Type === layoutType) return { context, layout: layouts.find(layout => layout.Type === layoutType && layout.Path === context.Path) };
    const eligible = layouts.filter(layout => layout.Type === layoutType &&
      (layout.Path === `${context.Path}/(layout)/This` ||
        (!hidden(layout.Hidden) && (layout.Name || layout.Path?.split('/').at(-1)) === context.Type &&
          [...folders.get(context.Path)].some(folder => within(layout.Path, folder)))));
    eligible.sort((a, b) => b.Path.split('/').length - a.Path.split('/').length);
    // PageWrapper's equal-depth ordering is not a stable precedence contract.
    if (eligible[1] && eligible[0].Path.split('/').length === eligible[1].Path.split('/').length) return { context };
    return { context, layout: eligible[0] };
  }).filter(({ layout }) => layout && !hidden(layout.Hidden) && !blocked(layout.Path, hiddenPaths) && Object.hasOwn(ZONES, layout.PageTemplate));
  if (!pages.length) return links;
  const layoutPaths = [...new Set(pages.map(({ layout }) => layout.Path))];
  const widgets = await query(`+TypeIs:${configuration.widgetType} +Hidden:0 +InFolder:(${layoutPaths.map(quote).join(' ')})`,
    'Id,Path,Type,Hidden,ClientComponent,PortletZone,ContentQuery,ContextBinding,ChildrenLevel,RelativePath,CustomRoot', 'CustomRoot');
  for (const { context, layout } of pages) {
    for (const widget of widgets) {
      if (typeof widget.Path !== 'string' || parent(widget.Path) !== layout.Path || hidden(widget.Hidden) ||
          blocked(widget.Path, hiddenPaths) || !LINK_LISTS.has(widget.ClientComponent) ||
          !ZONES[layout.PageTemplate].includes(widget.PortletZone)) continue;
      const list = boundList(widget, context, configuration.root);
      if (!list) continue;
      const possible = candidates.filter(content => parent(content.Path) === list.bound);
      for (let start = 0; start < possible.length; start += 100) {
        const chunk = possible.slice(start, start + 100);
        if (chunk.some(content => !Number.isSafeInteger(content.Id) || content.Id <= 0)) throw new Error('Invalid profile link candidate');
        const results = await query(`+InTree:${quote(configuration.root)} +Id:(${chunk.map(content => content.Id).join(' ')}) +(${list.expression})`, 'Id,Path,Type');
        for (const result of results) {
          if (!chunk.some(content => content.Id === result.Id && content.Path === result.Path && content.Type === result.Type)) {
            throw new Error('Invalid profile link query result');
          }
          if (!links.has(result.Path)) links.set(result.Path, new Set());
          links.get(result.Path).add(context.Path);
        }
      }
    }
  }
  return links;
}
