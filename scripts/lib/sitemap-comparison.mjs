function xmlText(value) {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(value)) throw new Error('Invalid sitemap XML entity');
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, entity) => {
    if (entity.startsWith('#')) {
      const hex = entity[1].toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (code < 32 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error('Invalid sitemap XML character');
      return String.fromCodePoint(code);
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()];
  });
}

// Read the plain urlset format produced by this generator; reject HTML, indexes,
// ambiguous entries and another site's baseline instead of inventing a diff.
export function sitemapEntries(xml, origin) {
  if (typeof xml !== 'string' || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml) ||
      !/^\s*(?:<\?xml[^?]*\?>\s*)?<urlset\b[^>]*>[\s\S]*<\/urlset>\s*$/.test(xml)) {
    throw new Error('Expected a plain sitemap urlset XML baseline');
  }
  const entries = new Map();
  const body = xml.replace(/^\s*(?:<\?xml[^?]*\?>\s*)?<urlset\b[^>]*>/, '').replace(/<\/urlset>\s*$/, '');
  const matches = [...body.matchAll(/<url>\s*<loc>([^<]*)<\/loc>([\s\S]*?)<\/url>/g)];
  if (!matches.length || body.replace(/<url>\s*<loc>[^<]*<\/loc>[\s\S]*?<\/url>/g, '').trim()) {
    throw new Error('Invalid or unsupported sitemap baseline entries');
  }
  for (const [, location, metadata] of matches) {
    if (!/^\s*(?:<(lastmod|changefreq|priority)>[^<]*<\/\1>\s*)*$/.test(metadata) ||
        (metadata.match(/<lastmod>/g) || []).length > 1) throw new Error('Invalid sitemap baseline metadata');
    const url = xmlText(location);
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Invalid sitemap baseline URL'); }
    if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.href !== url) {
      throw new Error('Baseline contains a URL outside the canonical site or an unsupported URL');
    }
    if (entries.has(url)) throw new Error('Duplicate URL in sitemap baseline');
    const lastmod = /<lastmod>([^<]*)<\/lastmod>/.exec(metadata)?.[1] || '';
    entries.set(url, { url, lastmod });
  }
  return entries;
}

export function compareSitemaps(baselineXml, proposed, origin) {
  const previous = sitemapEntries(baselineXml, origin);
  const current = new Map(proposed.entries.map(entry => [entry.url, entry]));
  const excluded = new Map(proposed.excluded.filter(entry => entry.url).map(entry => [entry.url, entry]));
  const retained = [];
  const removed = [];
  const added = [];
  for (const [url, old] of previous) {
    const entry = current.get(url);
    if (entry) retained.push({ ...entry, previousLastmod: old.lastmod, lastmodChanged: entry.lastmod !== old.lastmod });
    else removed.push({ ...excluded.get(url), url, lastmod: '', previousLastmod: old.lastmod,
      reason: excluded.get(url)?.reason || 'not-in-public-inventory' });
  }
  for (const entry of current.values()) if (!previous.has(entry.url)) added.push(entry);
  return {
    asOf: proposed.asOf,
    summary: { previous: previous.size, proposed: current.size, retained: retained.length, removed: removed.length,
      added: added.length, lastmodChanged: retained.filter(entry => entry.lastmodChanged).length, warnings: proposed.warnings.length },
    retained, removed, added, warnings: proposed.warnings,
  };
}

export function comparisonCsv(comparison) {
  const rows = [['change', 'url', 'contentPath', 'type', 'reason', 'lastmod', 'previousLastmod']];
  for (const change of ['retained', 'removed', 'added']) for (const entry of comparison[change]) {
    rows.push([change, entry.url, entry.path, entry.type, entry.reason, entry.lastmod, entry.previousLastmod]);
  }
  return '\uFEFF' + rows.map(row => row.map(value => {
    let cell = String(value ?? '');
    // Quoting does not disable spreadsheet formulas in untrusted source fields.
    if (/^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n') + '\r\n';
}
