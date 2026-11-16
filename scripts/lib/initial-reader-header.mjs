import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Opt-in, local build input. Site-specific artwork and configuration stay out of source control.
export async function prepareInitialReaderHeader(output, configPath) {
  if (!configPath) return;
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (!/^\/Root\/[\w /()-]+$/.test(config.root || '') || !config.name || !config.theme) throw Error('Invalid initial reader header configuration');
  const folder = resolve(output, 'reader-initial');
  await mkdir(folder, { recursive: true });
  for (const name of ['desktop', 'desktop2x', 'mobile', 'mobile2x']) {
    const bytes = await readFile(config[name]);
    const dimensions = name.startsWith('desktop') ? [205, 44] : [163, 32];
    const scale = name.endsWith('2x') ? 2 : 1;
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        bytes.readUInt32BE(16) !== dimensions[0] * scale || bytes.readUInt32BE(20) !== dimensions[1] * scale) throw Error(`Invalid header PNG: ${name}`);
    await writeFile(resolve(folder, `${name}.png`), bytes);
  }
  await copyFile(config.theme, resolve(folder, 'theme.css'));
  const file = resolve(output, 'index.html');
  let html = await readFile(file, 'utf8');
  if (html.includes('data-sn-initial-header')) throw Error('Initial reader header already prepared; rebuild first');
  const header = `<div class="App w3-theme-l5 reader-magazine" style="min-height:0" data-sn-initial-header data-site-root="${escape(config.root)}" data-page-template="reader-magazine"><header class="rm-header"><div class="rm-navigation"><a class="rm-brand" href="/" aria-label="${escape(config.name)}"><picture class="rm-brand-picture"><source media="(max-width: 600px)" srcset="/reader-initial/mobile.png 1x, /reader-initial/mobile2x.png 2x" width="163" height="32"><img class="rm-brand-image" src="/reader-initial/desktop.png" srcset="/reader-initial/desktop.png 1x, /reader-initial/desktop2x.png 2x" width="205" height="44" alt="${escape(config.name)}"></picture></a><div data-sn-initial-navigation></div></div></header></div>`;
  // The existing theme owns the geometry both before and after JS. The portal slot has no box.
  html = html.replace('</head>', `<link rel="stylesheet" href="/reader-initial/theme.css" data-sn-initial-stylesheet data-site-root="${escape(config.root)}"><style>[data-sn-initial-navigation]{display:contents}[data-sn-initial-header][hidden]{display:none!important}</style></head>`);
  html = html.replace(/(<body\b[^>]*>)/, `$1${header}`);
  await writeFile(file, html, 'utf8');
}
