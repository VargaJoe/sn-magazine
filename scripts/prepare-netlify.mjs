import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildRouting } from './lib/build-routing.mjs';
import { loadEnvironment } from './lib/load-environment.mjs';

loadEnvironment();
const output = resolve(process.env.BUILD_PATH || 'build');
const [redirects, robots] = await Promise.all([
  readFile('public/_redirects', 'utf8'), readFile('public/robots.txt', 'utf8'),
]);
const generated = buildRouting(process.env, redirects, robots);
await Promise.all([
  writeFile(resolve(output, '_redirects'), generated.redirects, 'utf8'),
  writeFile(resolve(output, 'robots.txt'), generated.robots, 'utf8'),
]);
console.log(`Prepared Netlify routing (sitemap proxy ${process.env.REACT_APP_SITEMAP_PATH?.trim() ? 'enabled' : 'disabled'}).`);
