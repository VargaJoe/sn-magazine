export const DEFAULT_PRESENTATION_PATH = '/(structure)/Site/presentation.json';

// Assets stay on the configured repository. CSS can refer to images and fonts
// relative to its own repository folder in the usual way.
export function repositoryAssetUrl(reference, baseUrl, repositoryUrl) {
  if (typeof reference !== 'string' || !reference.trim()) {
    throw new Error('An asset path must be a non-empty string');
  }
  const repository = new URL(repositoryUrl);
  const asset = new URL(reference, baseUrl);
  if (!['https:', 'http:'].includes(asset.protocol) ||
      asset.origin !== repository.origin || asset.username || asset.password ||
      /%(2f|5c)/i.test(asset.pathname) ||
      !decodeURIComponent(asset.pathname).startsWith('/Root/')) {
    throw new Error('Presentation files must be repository assets under /Root/');
  }
  return asset.href;
}

export function presentationUrl(repositoryUrl, sitePath, path = DEFAULT_PRESENTATION_PATH) {
  if (typeof sitePath !== 'string' || !sitePath.startsWith('/Root/')) {
    throw new Error('A repository site path is required');
  }
  // The override is site-relative, unless it names a full /Root/... path.
  const reference = path.startsWith('/Root/') ? path : `${sitePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  return repositoryAssetUrl(reference, repositoryUrl, repositoryUrl);
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function className(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || !value.split(/\s+/).filter(Boolean).every(token => identifier.test(token))) {
    throw new Error('Invalid presentation className');
  }
  return value;
}

export function parsePresentation(value, manifestUrl, repositoryUrl) {
  if (!isRecord(value) || value.version !== 1 ||
      (value.stylesheets !== undefined && !Array.isArray(value.stylesheets)) ||
      (value.layouts !== undefined && !isRecord(value.layouts))) {
    throw new Error('Unsupported presentation manifest (expected version 1)');
  }
  const stylesheets = [...new Set((value.stylesheets || []).map(path =>
    repositoryAssetUrl(path, manifestUrl, repositoryUrl)))];
  const layouts = Object.create(null);
  for (const [name, layout] of Object.entries(value.layouts || {})) {
    if (!identifier.test(name) || !isRecord(layout) || !Array.isArray(layout.zones) || !layout.zones.length) {
      throw new Error('Invalid presentation layout');
    }
    const names = new Set();
    const zones = layout.zones.map(zone => {
      if (!isRecord(zone) || typeof zone.name !== 'string' || !identifier.test(zone.name) || names.has(zone.name)) {
        throw new Error('Layout zone names must be unique identifiers');
      }
      names.add(zone.name);
      return { name: zone.name, className: className(zone.className) };
    });
    if (!names.has('content')) throw new Error('Every layout needs a content zone');
    layouts[name] = { className: className(layout.className), zones };
  }
  return { stylesheets, layouts };
}

export async function loadPresentation({ repositoryUrl, sitePath, path, signal, fetchImpl = fetch }) {
  const url = presentationUrl(repositoryUrl, sitePath, path);
  const response = await fetchImpl(url, { signal, credentials: 'omit', cache: 'no-cache' });
  // A missing manifest is the normal compatibility mode for existing sites.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Presentation request failed (${response.status})`);
  return parsePresentation(await response.json(), url, repositoryUrl);
}
