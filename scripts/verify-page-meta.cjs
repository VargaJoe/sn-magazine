// Requires Playwright (available via NODE_PATH in the Codex workspace runtime).
// --build optionally previews a local production build on the given origin in
// this browser only. Repository/API requests still use the real site services.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ''), all[index + 1]]);
  return pairs;
}, []));

async function main() {
  assert(args.origin && args.section && args.article,
    'Usage: node scripts/verify-page-meta.cjs --origin URL --section /Section --article /Section/Article [--build DIRECTORY]');
  const origin = new URL(args.origin).origin;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const checks = [];
  try {
    if (args.build) {
      const build = path.resolve(args.build);
      await context.route(`${origin}/**`, async route => {
        const url = new URL(route.request().url());
        const relative = route.request().isNavigationRequest() ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const file = path.resolve(build, relative);
        if (!file.startsWith(build + path.sep)) return route.continue();
        try {
          const body = await fs.readFile(file);
          const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
          await route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body });
        } catch (error) {
          if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
          await route.continue();
        }
      });
    }
    await context.addInitScript(() => {
      window.__pageMetaPushes = [];
      const layer = [];
      layer.push = function (...items) {
        for (const item of items) {
          if (item?.event === 'react_page_view') window.__pageMetaPushes.push({ ...item, titleAtPush: document.title });
        }
        return Array.prototype.push.apply(this, items);
      };
      window.dataLayer = layer;
    });
    async function verify(page, count, mode) {
      await page.waitForFunction(expected => window.__pageMetaPushes.length >= expected, count, { timeout: 30000 });
      // Allow delayed effects/re-renders to expose duplicate pushes.
      await page.waitForTimeout(500);
      const state = await page.evaluate(() => ({ title: document.title, path: location.pathname,
        views: window.__pageMetaPushes, canonical: document.querySelector('link[rel="canonical"]')?.href }));
      assert.equal(state.views.length, count, `${mode}: duplicate/missing page view`);
      const last = state.views.at(-1);
      assert.equal(last.page_title, state.title);
      assert.equal(last.page_title, last.titleAtPush, 'Title must be set before push');
      assert.equal(last.page_path, state.path);
      assert(state.title.trim() && !/undefined|W3\.CSS Template/.test(state.title));
      if (args.name) assert(state.title === args.name || state.title.startsWith(`${args.name} - `));
      checks.push({ mode, path: state.path, title: state.title, views: count });
    }
    for (const pathname of ['/', args.section, args.article]) {
      const page = await context.newPage();
      const response = await page.goto(origin + pathname, { waitUntil: 'domcontentloaded' });
      const source = await response.text();
      assert(!source.includes('W3.CSS Template'));
      assert.match(source, /<title>\s*<\/title>/);
      if (args.name) assert(!source.includes(args.name), 'Static HTML must be site neutral');
      await verify(page, 1, 'direct');
      await page.close();
    }
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await verify(page, 1, 'spa');
    let count = 1;
    for (const pathname of [args.section, args.article, '/']) {
      await page.locator(`a[href=${JSON.stringify(pathname)}]`).first().click();
      await verify(page, ++count, 'spa');
    }
    await page.goBack();
    await verify(page, ++count, 'back');
    await page.goForward();
    await verify(page, ++count, 'forward');
    // A -> still-loading B -> back A reuses A's history key. Delay the actual
    // repository request, then release it to check both dedupe and stale data.
    let pausedRoute;
    let signalPaused;
    const paused = new Promise(resolve => { signalPaused = resolve; });
    await page.route(/\/odata\.svc/i, route => {
      if (!pausedRoute) { pausedRoute = route; signalPaused(); }
      else return route.continue();
    });
    const pendingRequest = page.waitForRequest(/\/odata\.svc/i, { timeout: 10000 });
    await page.locator(`a[href=${JSON.stringify(args.section)}]`).first().click();
    await pendingRequest;
    await paused;
    await page.goBack();
    await verify(page, ++count, 'back-during-load');
    const lateResponse = page.waitForResponse(response => response.url() === pausedRoute.request().url());
    await pausedRoute.continue();
    await (await lateResponse).finished();
    await verify(page, count, 'late-response-ignored');
    console.log(JSON.stringify({ origin, localBuildOverride: args.build || null, checks }, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
