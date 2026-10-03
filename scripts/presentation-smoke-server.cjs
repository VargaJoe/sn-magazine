// Local full-app fixture: static CRA build + anonymous SenseNet-shaped responses.
// No live repository is contacted or modified by these fixture endpoints.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const build = path.resolve(process.argv[2] || 'build');
if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('Pass a built CRA directory');
const port = Number(process.env.PORT || 4179);
let scenario = 'alpha';
const scenarios = ['alpha', 'beta', 'legacy', 'broken', 'unknown'];
const site = '/Root/Content/smoke';
const workspace = { Id: 1, Type: 'Workspace', Name: 'smoke', DisplayName: 'Presentation fixture', Path: site, IsFolder: true };
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-cache' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function collection(child) {
  const layout = { Id: 2, ParentId: 1, Type: 'Layout', Name: 'This', Path: `${site}/(layout)/This`, Depth: 6,
    PageTemplate: scenario === 'legacy' ? 'leisure-simple' : scenario === 'unknown' ? 'repository:missing' : 'repository:main' };
  const widget = (id, zone, title, html) => ({ Id: id, ParentId: 2, Type: 'WidgetSimpleText', Path: `${layout.Path}/${id}`, PortletZone: zone, Title: title, ComponentContent: html });
  return [layout,
    widget(10, 'side', 'Navigation', '<a href="/">Home</a> · <a href="/child">Child page</a>'),
    widget(20, 'content', `${scenario.toUpperCase()} ${child ? 'child' : 'home'}`, `<p>Repository widget content: ${child ? 'child page' : 'homepage'}.</p><img src="${site}/(structure)/Site/marker.svg" alt="Repository SVG asset" width="24" height="24"/><a href="${child ? '/' : '/child'}">${child ? 'Return home' : 'Open child page'}</a>`),
    widget(30, 'footer', 'Footer', '<p>Repository footer widget.</p>'),
  ];
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === '/__scenarios') {
    return send(res, 200, `<h1>Presentation scenarios</h1>${scenarios.map(name => `<p><a href="/__scenario/${name}">${name}</a></p>`).join('')}`, 'text/html');
  }
  if (pathname.startsWith('/__scenario/')) {
    const name = pathname.slice('/__scenario/'.length);
    if (!scenarios.includes(name)) return send(res, 404, {});
    scenario = name;
    res.writeHead(302, { Location: '/' });
    return res.end();
  }
  if (pathname === `${site}/(structure)/Site/presentation.json`) {
    if (scenario === 'legacy') return send(res, 404, {});
    if (scenario === 'broken') return send(res, 200, '{broken json', 'application/json');
    return send(res, 200, { version: 1, stylesheets: [`${scenario}.css`], layouts: {
      main: { className: `fixture-${scenario}`, zones: (scenario === 'beta' ? ['content', 'footer', 'side'] : ['side', 'content', 'footer']).map(name => ({ name })) },
    } });
  }
  if (pathname.endsWith('.css') && pathname.startsWith(site)) {
    const color = scenario === 'beta' ? 'rgb(20, 70, 120)' : 'rgb(95, 45, 15)';
    return send(res, 200, `.sn-site-layout { display:grid; grid-template-columns:${scenario === 'beta' ? '1fr' : '240px 1fr'}; gap:12px; padding:20px; color:${color}; }
      .sn-site-zone { border:3px solid ${color}; padding:12px; }
      [data-sn-zone="content"] { background-image:url('./marker.svg'); background-repeat:no-repeat; background-position:right top; }
      @media(max-width:600px) { .sn-site-layout { grid-template-columns:1fr; } }`, 'text/css');
  }
  if (pathname === `${site}/(structure)/Site/marker.svg`) {
    return send(res, 200, '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="orange"/></svg>', 'image/svg+xml');
  }
  if (pathname.toLowerCase().startsWith('/odata.svc/')) {
    if (url.searchParams.has('query')) {
      const child = (url.searchParams.get('query') || '').includes(`${site}/child`);
      const results = collection(child);
      return send(res, 200, { d: { results, __count: results.length } });
    }
    const contentPath = pathname.replace(/\('([^']*)'\)/g, '/$1').replace(/\/+/g, '/');
    const child = contentPath.includes('/child');
    return send(res, 200, { d: { ...workspace, Id: child ? 4 : 1, Name: child ? 'child' : 'smoke', DisplayName: child ? 'Child page' : workspace.DisplayName,
      Path: child ? `${site}/child` : site, Workspace: workspace } });
  }
  // Return a clear local-only response for optional authentication lookups.
  if (pathname.startsWith('/auth')) return send(res, 404, {});
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(build, relative);
  if (!file.startsWith(`${build}${path.sep}`)) return send(res, 400, {});
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return send(res, 200, fs.readFileSync(file), mime[path.extname(file)] || 'application/octet-stream');
  }
  if (!path.extname(pathname)) return send(res, 200, fs.readFileSync(path.join(build, 'index.html')), 'text/html');
  send(res, 404, {});
}).listen(port, '127.0.0.1', () => console.log(`Local presentation fixture: http://127.0.0.1:${port}/__scenarios`));
