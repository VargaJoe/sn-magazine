// Preview a local production build against its real anonymous repository.
// Fault injection affects only this isolated browser; no deploy or API writes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Repository } = require('@sensenet/client-core');

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ''), all[index + 1]]);
  return pairs;
}, []));

async function main() {
  assert(args.env && args.build, 'Usage: node scripts/verify-error-pages.cjs --env PRIVATE_ENV --build BUILD_DIRECTORY [--output REPORT.json]');
  const { chromium } = require(args.playwright || 'playwright');
  const env = require('dotenv').parse(await fs.readFile(args.env));
  const origin = new URL(env.REACT_APP_SITE_HOST).origin;
  const build = path.resolve(args.build);
  const repo = new Repository({ repositoryUrl: env.REACT_APP_API_URL }, fetch);
  const home = (await repo.load({ idOrPath: env.REACT_APP_DATA_PATH,
    oDataOptions: { select: 'all', expand: ['Workspace', 'Children'] } })).d;
  assert(home?.DisplayName, 'Anonymous site root must resolve');
  const missing = `/__codex_missing_${Date.now()}/nested`;
  const title404 = `${home.DisplayName} - ${env.REACT_APP_NOT_FOUND_TITLE || 'Az oldal nem található'}`;
  const browser = await chromium.launch({ headless: true, ...(args.channel ? { channel: args.channel } : {}) });
  const context = await browser.newContext();
  const checks = [];
  const networkFailures = [];
  const consoleFailures = [];
  context.on('page', page => page.on('console', message => {
    if (message.type() === 'error') consoleFailures.push(message.text().slice(0, 600));
  }));
  context.on('response', response => {
    if (response.url().startsWith(env.REACT_APP_API_URL) && response.status() >= 400) {
      networkFailures.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  context.on('requestfailed', request => networkFailures.push({ path: new URL(request.url()).pathname,
    failure: request.failure()?.errorText }));
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' };
  try {
    // Prefer the actual Compose preview for browser address-space checks. A
    // synthetic document fulfilled from disk can be classified as public and
    // Chrome then refuses its requests to a loopback API before CORS runs.
    if (args.live !== 'true') await context.route(`${origin}/**`, async route => {
      const url = new URL(route.request().url());
      const relative = route.request().isNavigationRequest() ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.resolve(build, relative);
      if (!file.startsWith(build + path.sep)) return route.continue();
      try {
        const body = await fs.readFile(file);
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
        return route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body });
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
        return route.continue();
      }
    });
    await context.addInitScript(() => {
      window.__errorPageViews = [];
      const layer = [];
      layer.push = function (...items) {
        for (const item of items) {
          if (item?.event === 'react_page_view') window.__errorPageViews.push({ ...item, titleAtPush: document.title });
        }
        return Array.prototype.push.apply(this, items);
      };
      window.dataLayer = layer;
    });
    async function verify(page, count, type, mode, title) {
      await page.waitForFunction(expected => window.__errorPageViews.length >= expected, count, { timeout: 40000 });
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => ({ title: document.title, path: window.location.pathname,
        views: window.__errorPageViews, robots: document.querySelector('meta[name="robots"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href }));
      assert.equal(state.views.length, count, `${mode}: one event per navigation`);
      const event = state.views.at(-1);
      assert.equal(event.page_type, type, `${mode}: ${JSON.stringify({ network: networkFailures.slice(-5), console: consoleFailures.slice(-3) })}`);
      assert.equal(event.page_title, event.titleAtPush, 'Title must be set before push');
      assert.equal(event.page_path, state.path);
      if (title) assert.equal(state.title, title);
      assert.equal(state.robots, type === 'content' ? undefined : 'noindex');
      assert.equal(state.canonical, type === 'not_found' ? undefined : origin + state.path);
      if (type !== 'content') {
        assert.equal(await page.locator('[data-sn-initial-header]:visible').count(), 0,
          `${mode}: the optional content header must not overlay an error page`);
        assert(await page.locator('[data-sn-initial-stylesheet]').evaluateAll(links => links.every(link => link.disabled)),
          `${mode}: the optional snapshot stylesheet must be inactive`);
        assert.equal(await page.locator('[data-sn-page-stylesheet]').count(), 0,
          `${mode}: no native page stylesheet remains active`);
      }
      checks.push({ mode, type, views: count });
    }

    const baseline = await context.newPage();
    await baseline.goto(origin, { waitUntil: 'domcontentloaded' });
    await verify(baseline, 1, 'content', 'real-home-baseline');
    const homeTitle = await baseline.title();
    await baseline.close();

    const page = await context.newPage();
    const response = await page.goto(origin + missing, { waitUntil: 'domcontentloaded' });
    const source = await response.text();
    if (args.live === 'true') assert.equal(source, await fs.readFile(path.join(build, 'index.html'), 'utf8'),
      'The live Compose preview must serve the exact build under verification');
    assert.match(source, /<title>\s*<\/title>/);
    if (!source.includes('data-sn-initial-header')) {
      assert(!source.includes(home.DisplayName), 'The default source HTML remains site neutral');
    }
    await verify(page, 1, 'not_found', 'real-api-404', title404);
    const sections = page.locator('main nav a');
    assert(await sections.count() > 0, 'Known site must offer its configured main sections');
    if (args.output) await page.screenshot({ path: args.output.replace(/\.json$/, '') + '-404.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '404 must fit a mobile viewport');
    if (args.output) await page.screenshot({ path: args.output.replace(/\.json$/, '') + '-404-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    await sections.first().click();
    await verify(page, 2, 'content', 'section-link-after-404');
    await page.goBack();
    await verify(page, 3, 'not_found', 'back-from-section', title404);
    await page.locator('main a[href="/"]').click();
    await verify(page, 4, 'content', 'home-after-404', homeTitle);
    await page.goBack();
    await verify(page, 5, 'not_found', 'back-to-404', title404);
    await page.goForward();
    await verify(page, 6, 'content', 'forward-to-home', homeTitle);
    await page.close();

    const empty = await context.newPage();
    await empty.route(/\/odata\.svc/i, route => decodeURIComponent(route.request().url()).includes('__codex_missing_')
      ? route.fulfill({ status: 200, contentType: 'application/json', body: '{"d":null}', headers: cors })
      : route.continue());
    await empty.goto(origin + missing, { waitUntil: 'domcontentloaded' });
    await verify(empty, 1, 'not_found', 'empty-success', title404);
    await empty.close();

    for (const mode of ['network', '503', 'timeout']) {
      const errorPage = await context.newPage();
      const held = [];
      await errorPage.route(/\/odata\.svc/i, route => {
        if (mode === 'network') return route.abort('failed');
        if (mode === '503') return route.fulfill({ status: 503, contentType: 'application/json',
          body: '{"error":{"message":{"value":"Unavailable"}}}', headers: cors });
        held.push(route);
      });
      await errorPage.goto(origin, { waitUntil: 'domcontentloaded' });
      await verify(errorPage, 1, 'error', mode,
        `${env.REACT_APP_MAINTENANCE_SITE_NAME || 'Logo'} - ${env.REACT_APP_MAINTENANCE_TITLE || 'Site Under Maintenance'}`);
      assert(await errorPage.locator('button').count() > 0);
      assert((await errorPage.locator('body').innerText()).includes(env.REACT_APP_MAINTENANCE_SITE_NAME || 'Logo'),
        'An offline cold start must retain its configured plain site name');
      if (args.output && mode === '503') {
        await errorPage.screenshot({ path: args.output.replace(/\.json$/, '') + '-maintenance.png', fullPage: true });
        await errorPage.setViewportSize({ width: 390, height: 844 });
        assert(await errorPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Maintenance fits mobile');
        await errorPage.screenshot({ path: args.output.replace(/\.json$/, '') + '-maintenance-mobile.png', fullPage: true });
      }
      await errorPage.unroute(/\/odata\.svc/i);
      for (const route of held) await route.abort().catch(() => {});
      await errorPage.locator('button').click();
      await errorPage.waitForFunction(name => document.title === name && !document.querySelector('meta[name="robots"]'), homeTitle);
      // Retry is the same navigation: title changes but the first error event stays.
      await errorPage.waitForTimeout(200);
      const recovered = await errorPage.evaluate(() => ({ title: document.title,
        robots: document.querySelector('meta[name="robots"]')?.content, views: window.__errorPageViews }));
      assert.equal(recovered.title, homeTitle);
      assert.equal(recovered.robots, undefined);
      assert.equal(recovered.views.length, 1);
      assert.equal(recovered.views[0].page_type, 'error');
      if (source.includes('data-sn-initial-header')) {
        assert.equal(await errorPage.locator('[data-sn-initial-header]:visible').count(), 1,
          'A successful retry restores the matching native reader header');
        assert(await errorPage.locator('[data-sn-initial-stylesheet]').evaluateAll(links => links.every(link => !link.disabled)),
          'A successful retry restores the snapshot stylesheet');
      }
      checks.push({ mode: `${mode}-retry`, type: 'content', views: 1 });
      await errorPage.close();
    }
    const report = { localBuild: true, realAnonymousRepository: true, checks };
    if (args.output) await fs.writeFile(args.output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
