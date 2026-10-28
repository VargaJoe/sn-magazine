import { writeFile } from 'node:fs/promises';
import { generateSitemap } from './lib/sitemap.mjs';
import { updateRepositorySitemap } from './lib/repository-sitemap.mjs';
import { readSiteSettings } from './lib/site-settings.mjs';
import { loadEnvironment } from './lib/load-environment.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node --env-file=.env.site-private scripts/update-sitemap.mjs [--output <local-file>]\n' +
    'Default: generate and create/overwrite REACT_APP_SITEMAP_PATH in SenseNet.\n' +
    '--output: generate a local preview only, with no repository writes or writer credentials.\n' +
    'Upload credentials: private SENSENET_API_KEY or SENSENET_ACCESS_TOKEN (never REACT_APP_*).');
} else {
  try {
    if (args.length && !(args.length === 2 && args[0] === '--output' && !args[1].startsWith('--'))) {
      throw new Error('Unknown arguments; use --help');
    }
    loadEnvironment();
    readSiteSettings(process.env, { requireSitemap: true });
    if (args[0] === '--output') {
      const xml = await generateSitemap(process.env);
      await writeFile(args[1], xml, 'utf8');
      console.log(JSON.stringify({ preview: true, urls: [...xml.matchAll(/<loc>/g)].length, bytes: Buffer.byteLength(xml) }));
    } else {
      console.log(JSON.stringify(await updateRepositorySitemap(process.env)));
    }
  } catch (error) {
    // Controlled errors do not include server bodies, configuration values or credentials.
    console.error(`Sitemap update failed: ${error.message}`);
    process.exitCode = 1;
  }
}
