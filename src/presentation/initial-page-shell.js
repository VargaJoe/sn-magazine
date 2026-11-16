import { useLayoutEffect } from 'react';

// An optional build snapshot can precede repository resolution. Once a page is
// resolved, only its matching native template may keep that snapshot visible.
export default function InitialPageShell({ root, pageType, page }) {
  const template = page?.PageTemplate;
  useLayoutEffect(() => {
    const header = document.querySelector('[data-sn-initial-header]');
    if (!header) return;
    const sameSite = header.dataset.siteRoot === root;
    // Preserve the previous state during navigation/retry. In particular, an
    // outage must not flash the snapshot again before a retry actually succeeds.
    if (!pageType && sameSite) return;
    const visible = sameSite && pageType === 'content' &&
      template === header.dataset.pageTemplate;
    header.hidden = !visible;
    document.querySelectorAll('[data-sn-initial-stylesheet]').forEach(link => {
      if (link.dataset.siteRoot === header.dataset.siteRoot) link.disabled = !visible;
    });
  }, [root, pageType, template]);
  return null;
}
