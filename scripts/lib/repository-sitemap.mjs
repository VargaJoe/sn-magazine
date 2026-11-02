import { generateSitemap } from './sitemap.mjs';
import { itemUrl, readSiteSettings } from './site-settings.mjs';

function writerHeaders(env) {
  const key = env.SENSENET_API_KEY?.trim();
  const token = env.SENSENET_ACCESS_TOKEN?.trim();
  if ((!key && !token) || (key && token) || /[\r\n]/.test(key || token)) {
    throw new Error('Set exactly one private SENSENET_API_KEY or SENSENET_ACCESS_TOKEN');
  }
  return key ? { apikey: key } : { Authorization: `Bearer ${token}` };
}

async function request(url, fetchImpl, options = {}) {
  const response = await fetchImpl(url, { credentials: 'omit', redirect: 'error',
    signal: AbortSignal.timeout(30000), ...options });
  return response;
}

function discard(response) {
  // Do not await cancellation: a tee'd response can wait for its other reader.
  response.body?.cancel().catch(() => {});
}

async function metadata(settings, path, headers, fetchImpl) {
  const url = itemUrl(settings.api, path);
  url.searchParams.set('$select', 'Id,Path,Type,IsFolder,Locked');
  url.searchParams.set('metadata', 'no');
  const response = await request(url, fetchImpl, { headers: { ...headers, Accept: 'application/json' } });
  if (!response.ok) {
    discard(response);
    if (response.status === 404) return null;
    throw new Error(`Cannot inspect sitemap target (HTTP ${response.status})`);
  }
  const content = (await jsonResponse(response, 'Invalid sitemap target metadata'))?.d;
  if (!content || content.Path !== path || typeof content.Type !== 'string') {
    throw new Error('Invalid sitemap target metadata');
  }
  return content;
}

async function requirePermission(settings, path, permission, headers, fetchImpl) {
  const url = itemUrl(settings.api, path, 'HasPermission');
  url.searchParams.set('permissions', permission);
  const response = await request(url, fetchImpl, { headers: { ...headers, Accept: 'application/json' } });
  if (!response.ok) discard(response);
  const body = response.ok ? await jsonResponse(response, 'Invalid permission response') : null;
  if (!response.ok || (body !== true && body?.d !== true)) {
    throw new Error(`Sitemap target requires ${permission} permission`);
  }
}

export async function readPublicSitemap(settings, fetchImpl = fetch) {
  const response = await request(settings.sitemapUrl, fetchImpl, {
    cache: 'no-store', headers: { Accept: 'application/xml, text/xml', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    discard(response);
    throw new Error(`Sitemap file must be publicly readable (HTTP ${response.status})`);
  }
  if (!/^(application|text)\/xml(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    discard(response);
    throw new Error('Sitemap file must be served with an XML Content-Type');
  }
  return response.text();
}

async function jsonResponse(response, message) {
  try { return await response.json(); } catch { throw new Error(message); }
}

export async function updateRepositorySitemap(env, fetchImpl = fetch) {
  const settings = readSiteSettings(env, { requireSitemap: true });
  const headers = writerHeaders(env);
  const target = await metadata(settings, settings.repositoryPath, headers, fetchImpl);
  const parentPath = settings.repositoryPath.slice(0, settings.repositoryPath.lastIndexOf('/'));
  if (target) {
    if (target.Type !== 'File' || target.IsFolder !== false || target.Locked) {
      throw new Error('Sitemap target must be an unlocked File content');
    }
    await requirePermission(settings, settings.repositoryPath, 'Open,Save', headers, fetchImpl);
  } else {
    const parent = await metadata(settings, parentPath, headers, fetchImpl);
    if (!parent?.IsFolder) throw new Error('Create the sitemap parent folder before uploading');
    await requirePermission(settings, parentPath, 'Open,AddNew', headers, fetchImpl);
  }
  // These reads deliberately remain anonymous even though the writer has credentials.
  const previous = target ? await readPublicSitemap(settings, fetchImpl) : null;
  const xml = await generateSitemap(env, fetchImpl);
  const result = { updated: false, urls: [...xml.matchAll(/<loc>/g)].length, bytes: Buffer.byteLength(xml) };
  if (previous === xml) return result;

  const fileName = settings.repositoryPath.slice(settings.repositoryPath.lastIndexOf('/') + 1);
  const form = new FormData();
  for (const [name, value] of Object.entries({ ChunkToken: '0*0*False*False', FileName: fileName,
    Overwrite: 'true', PropertyName: 'Binary', FileLength: String(Buffer.byteLength(xml)),
    ContentType: 'File', UseChunk: 'false' })) form.set(name, value);
  form.set(fileName, new Blob([xml], { type: 'application/xml' }), fileName);
  const response = await request(itemUrl(settings.api, parentPath, 'Upload'), fetchImpl, {
    method: 'POST', headers, body: form,
  });
  discard(response);
  if (!response.ok) throw new Error(`Sitemap upload failed (HTTP ${response.status})`);
  // Upload success alone is insufficient: approval/versioning/ACLs may hide the new data.
  if (await readPublicSitemap(settings, fetchImpl) !== xml) {
    throw new Error('Uploaded sitemap differs from its public version; check publication/approval and origin caching');
  }
  return { ...result, updated: true };
}
