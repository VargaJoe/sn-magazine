import React from 'react';
import { useSnStore } from '../store/sn-store';
import { CachedComponentsByZone } from '../utils/add-component';
import { MagazineProvider, useMagazine } from '../magazine/provider';
import { MagazineIcons } from '../magazine/branding';
import { initialReaderHeader } from '../magazine/initial-header';

function MagazineShell({ context, widgets }) {
  const { loading, error, root } = useMagazine();
  return <div className="App w3-theme-l5 reader-magazine" aria-busy={loading}>
    <MagazineIcons />
    <a href="#reader-main" className="rm-skip-link">Ugrás a tartalomra</a>
    {initialReaderHeader(root)
      ? <CachedComponentsByZone type="widgets" zone="header" widgets={widgets} context={context} />
      : <header className="rm-header"><CachedComponentsByZone type="widgets" zone="header" widgets={widgets} context={context} /></header>}
    <main id="reader-main" className="rm-main" tabIndex="-1">{error && <p role="alert">A tartalom most nem tölthető be.</p>}<CachedComponentsByZone type="widgets" zone="main" widgets={widgets} context={context} /></main>
    <footer className="rm-footer"><div className="rm-footer-grid"><CachedComponentsByZone type="widgets" zone="footer" widgets={widgets} context={context} /></div></footer>
  </div>;
}

export default function ReaderMagazine() {
  const { context, widgets } = useSnStore();
  return <MagazineProvider context={context} widgets={widgets}>
    <MagazineShell context={context} widgets={widgets} />
  </MagazineProvider>;
}
