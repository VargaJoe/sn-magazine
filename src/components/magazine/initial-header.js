// The optional static header owns its logo throughout loading and client navigation.
export function initialReaderHeader(root) {
  const header = document.querySelector('[data-sn-initial-header]');
  return root && header?.dataset.siteRoot === root ? header : null;
}
