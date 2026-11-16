let loaders = Object.freeze(Object.create(null));
let revision = 0;
const keyPattern = /^(layouts|widgets|content)\/[a-z0-9_-]+$/i;

// A consumer supplies only its own statically imported modules. Repository data
// selects a known key; it can never turn into a filesystem/module request.
export function registerComponentLoaders(entries) {
  const next = Object.create(null);
  for (const [key, loader] of Object.entries(entries)) {
    if (!keyPattern.test(key) || typeof loader !== 'function') throw new Error('Invalid component registration');
    next[key] = loader;
  }
  loaders = Object.freeze(next);
  revision++;
}

export function getComponent(key) {
  if (!keyPattern.test(key) || !Object.prototype.hasOwnProperty.call(loaders, key)) throw new Error('Unknown component');
  const component = loaders[key]();
  if (!component) throw new Error('Component has no default export');
  return component;
}

export const getRegistryRevision = () => revision;
