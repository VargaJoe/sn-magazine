import React from 'react';
import { useSnStore } from '../store/sn-store';
import { CachedComponentsByZone } from '../utils/add-component';

// The Page's child Widgets own the section types, content sources and order.
// This reusable template supplies only the document landmarks and named zones.
export default function EditorialFlowPage() {
  const { context, widgets } = useSnStore();
  const zone = name => (
    <CachedComponentsByZone type="widgets" zone={name} widgets={widgets} context={context} />
  );
  return (
    <div className="App w3-theme-l5 editorial-site">
      <a className="ed-skip" href="#ed-main">Ugrás a tartalomra</a>
      <header className="ed-header">{zone('header')}</header>
      <main id="ed-main" className="ed-main" tabIndex={-1}>{zone('main')}</main>
      <footer className="ed-footer">{zone('footer')}</footer>
    </div>
  );
}
