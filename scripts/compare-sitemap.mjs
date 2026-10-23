import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateSitemapReport } from './lib/sitemap.mjs';
import { compareSitemaps, comparisonCsv } from './lib/sitemap-comparison.mjs';
import { readPublicSitemap } from './lib/repository-sitemap.mjs';
import { readSiteSettings } from './lib/site-settings.mjs';
import { loadEnvironment } from './lib/load-environment.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node --env-file=.env.site-private scripts/compare-sitemap.mjs [--baseline <saved-xml>] [--output <private-directory>]\n' +
    'Read-only comparison with the stored public sitemap, or a saved generator XML baseline.\n' +
    '--output writes proposed.xml, comparison.json and changes.csv locally; it never uploads.');
} else {
  try {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--baseline', '--output'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) {
        throw new Error('Unknown, duplicate or missing arguments; use --help');
      }
      options[args[i]] = args[i + 1];
    }
    loadEnvironment();
    const settings = readSiteSettings(process.env, { requireSitemap: true });
    const baseline = options['--baseline'] ? await readFile(options['--baseline'], 'utf8') : await readPublicSitemap(settings);
    const proposed = await generateSitemapReport(process.env);
    const comparison = compareSitemaps(baseline, proposed, settings.origin);
    if (options['--output']) {
      const directory = resolve(options['--output']);
      await mkdir(directory, { recursive: true });
      await Promise.all([
        writeFile(resolve(directory, 'proposed.xml'), proposed.xml),
        writeFile(resolve(directory, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n'),
        writeFile(resolve(directory, 'changes.csv'), comparisonCsv(comparison)),
      ]);
    }
    console.log(JSON.stringify({ preview: true, ...comparison.summary }, null, 2));
  } catch (error) {
    console.error(`Sitemap comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}
