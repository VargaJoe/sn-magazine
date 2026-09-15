import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useRepository } from '@sensenet/hooks-react';
import { CachedComponentsByZone } from '../utils/add-component';
import { useSnStore } from '../store/sn-store';
import deepEqual from '../utils/deep-equal';
// Temporary layout-slot chrome only. Authoritative skin CSS lives in ECM:
//   {API}{DATA_PATH}/(structure)/Site/skin.css  (same Site folder as logo.png)
import './fotel-r5-slots.css';

const defaultLogo = require('../../images/logo.png');

/** ECM cover/still → absolute API URL. No stock bake. */
function mediaUrl(item) {
  if (!item) return null;
  if (item.Image?.Url) return `${process.env.REACT_APP_API_URL}${item.Image.Url}`;
  if (item.Binary?.__mediaresource?.media_src) {
    return `${process.env.REACT_APP_API_URL}${item.Binary.__mediaresource.media_src}`;
  }
  return null;
}

function relativePath(path) {
  const base = process.env.REACT_APP_DATA_PATH || '';
  if (!path) return '/';
  if (path.startsWith(base)) {
    const rel = path.substr(base.length);
    return rel.startsWith('/') ? rel : `/${rel}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

function siteLogoUrl() {
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const dataPath = process.env.REACT_APP_DATA_PATH || '';
  const logoPath = process.env.REACT_APP_LOGO_PATH;
  if (!logoPath) return defaultLogo;
  const url = `${apiUrl}${dataPath}${logoPath}`;
  if (url === apiUrl || url === `${apiUrl}${dataPath}`) return defaultLogo;
  return url;
}

/** ECM theme asset next to logo — one engine, many site skins. */
function ecmSkinCssUrl() {
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const dataPath = process.env.REACT_APP_DATA_PATH || '';
  const skinPath = process.env.REACT_APP_SKIN_CSS_PATH || '/(structure)/Site/skin.css';
  return `${apiUrl}${dataPath}${skinPath}`;
}

function guessCategoryLabel(name = '', path = '') {
  const n = `${name} ${path}`.toLowerCase();
  if (n.includes('film')) return 'Film';
  if (n.includes('könyv') || n.includes('konyv') || n.includes('book')) return 'Könyv';
  if (n.includes('játék') || n.includes('jatek') || n.includes('game')) return 'Játékkönyv';
  if (n.includes('sorozat') || n.includes('series')) return 'Sorozat';
  return 'Esszé';
}

function formatDate(src) {
  if (!src) return '';
  try {
    return new Date(src).toISOString().slice(0, 10).replace(/-/g, '.');
  } catch {
    return '';
  }
}

/**
 * FotelVándor R5 homepage — layout slots only; skin/content from SenseNet ECM.
 * PageTemplate: fotel-r5
 *
 * Publish filter (restored from ECM SmartFolder queries under (structure)/Queries):
 *   +PublishDate:<@@CurrentTime@@
 * Same rule as LEGFRISSEBB UTAZÁSOK / HÍREK — future PublishDate never on fold/lists.
 *
 * Nav: ECM LeisureCategory/SoftLink (DisplayZone menuitem / menuicon), not hardcoded routes.
 * Logo: REACT_APP_LOGO_PATH via API (live site logo).
 * Images: content Image.Url; empty gradient fallback if missing — no public/fotel-r5 stock.
 */
export const FotelR5Layout = React.memo((props) => {
  const { context, widgets } = useSnStore((state) => state, deepEqual);
  const repo = useRepository();
  const location = useLocation();
  const [navCats, setNavCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [logoOk, setLogoOk] = useState(true);

  const dataPath = process.env.REACT_APP_DATA_PATH || '/Root/Content/fotelvandor';
  const logoUrl = useMemo(() => siteLogoUrl(), []);
  const skinCss = useMemo(() => ecmSkinCssUrl(), []);

  const loadHomeData = useCallback(async () => {
    if (!repo) return;

    // Side-menu pattern (ECM widget "Side menu"): categories + softlinks, Hidden:0
    try {
      const cats = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query: '+Type:(LeisureCategory SoftLink) +Hidden:0',
          select: ['Id', 'Name', 'DisplayName', 'Path', 'Index', 'IconName', 'DisplayZone', 'Url', 'Type'],
          orderby: ['Index', 'DisplayName'],
          top: 40,
          metadata: 'no',
          enablelifespanfilter: 'on',
        },
      });
      setNavCats(cats?.d?.results || []);
    } catch (e) {
      console.warn('[fotel-r5] nav/menu ECM load failed', e?.message || e);
      setNavCats([]);
    }

    // Same publish filter as ECM SmartFolder LEGFRISSEBB UTAZÁSOK
    try {
      const reviews = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query:
            `+InTree:('${dataPath}/Könyv' '${dataPath}/Sorozat' '${dataPath}/Film' '${dataPath}/Játékkönyv') ` +
            '+TypeIs:LeisureArticle +Hidden:0 +PublishDate:<@@CurrentTime@@',
          select: 'all',
          orderby: [['PublishDate', 'desc']],
          top: 8,
          metadata: 'no',
          enablelifespanfilter: 'on',
        },
      });
      setFeatured(reviews?.d?.results || []);
    } catch (e) {
      console.warn('[fotel-r5] featured ECM load failed', e?.message || e);
      setFeatured([]);
    }

    // Same publish filter as ECM SmartFolder HÍREK
    try {
      const news = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query: `+InTree:('${dataPath}/hírek') +TypeIs:LeisureArticle +Hidden:0 +PublishDate:<@@CurrentTime@@`,
          select: ['Id', 'Name', 'DisplayName', 'Path', 'PublishDate', 'ModificationDate', 'Image'],
          orderby: [['PublishDate', 'desc']],
          top: 4,
          metadata: 'no',
          enablelifespanfilter: 'on',
        },
      });
      setNewsItems(news?.d?.results || []);
    } catch (e) {
      console.warn('[fotel-r5] news ECM load failed', e?.message || e);
      setNewsItems([]);
    }
  }, [repo, dataPath]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const navItems = useMemo(() => {
    const home = { id: 'home', label: 'Főoldal', path: '/' };
    const items = (navCats || [])
      .filter((c) => Array.isArray(c.DisplayZone) && c.DisplayZone.includes('menuitem'))
      .map((c) => ({
        id: c.Id,
        label: c.DisplayName || c.Name,
        path: c.Type === 'SoftLink' && c.Url ? c.Url : relativePath(c.Path),
        external: c.Type === 'SoftLink' && !!c.Url,
      }));
    return [home, ...items];
  }, [navCats]);

  const iconItems = useMemo(() => {
    const fromZone = (navCats || []).filter(
      (c) => Array.isArray(c.DisplayZone) && (c.DisplayZone.includes('menuicon') || c.DisplayZone.includes('menuitem'))
    );
    // Prefer explicit menuicon; else menuitem categories for circular icon row
    const icons = fromZone.filter((c) => c.DisplayZone.includes('menuicon'));
    const source = icons.length ? icons : fromZone.filter((c) => c.DisplayZone.includes('menuitem'));
    return source.map((c) => ({
      id: c.Id,
      label: c.DisplayName || c.Name,
      path: relativePath(c.Path),
      iconClass: c.IconName || null,
    }));
  }, [navCats]);

  const heroEssay = useMemo(() => {
    const first = featured[0];
    if (!first) return null;
    const img = mediaUrl(first);
    return {
      title: first.DisplayName || first.Name,
      lead: first.Description || first.Lead || first.Subtitle || '',
      category: guessCategoryLabel(first.DisplayName || first.Name || '', first.Path || ''),
      meta: first.Author || 'Esszé',
      date: formatDate(first.PublishDate || first.ModificationDate),
      path: relativePath(first.Path),
      image: img,
    };
  }, [featured]);

  const trips = useMemo(() => {
    return featured.slice(0, 3).map((item) => ({
      id: item.Id,
      title: item.DisplayName || item.Name,
      subtitle: item.Description || item.Lead || '',
      tag: guessCategoryLabel(item.DisplayName || item.Name || '', item.Path || ''),
      image: mediaUrl(item),
      path: relativePath(item.Path),
    }));
  }, [featured]);

  const latest = useMemo(() => {
    return featured.slice(0, 2).map((item) => ({
      id: item.Id,
      title: item.DisplayName || item.Name,
      subtitle: item.Description || item.Lead || '',
      image: mediaUrl(item),
      path: relativePath(item.Path),
    }));
  }, [featured]);

  const collectionThumbs = useMemo(() => {
    return featured.slice(0, 3).map((item) => ({
      id: item.Id,
      image: mediaUrl(item),
      title: item.DisplayName || item.Name,
      path: relativePath(item.Path),
    }));
  }, [featured]);

  const demotedNews = useMemo(() => {
    return newsItems.slice(0, 3).map((n) => ({
      id: n.Id,
      title: n.DisplayName || n.Name,
      date: formatDate(n.PublishDate),
      path: relativePath(n.Path),
    }));
  }, [newsItems]);

  const archivePath =
    navItems.find((n) => /vissza|archív|archiv/i.test(n.label))?.path ||
    relativePath(`${dataPath}/Visszatekintés`);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname.toLowerCase().startsWith(String(path).toLowerCase());
  };

  const safeWidgets = Array.isArray(widgets) ? widgets : [];

  return (
    <div className="fotel-r5 App">
      <Helmet>
        {/* ECM skin (Fotel vs Manga tokens). 404 until uploaded — slots CSS still boots layout. */}
        <link rel="stylesheet" href={skinCss} />
        <title>{context?.DisplayName || context?.Workspace?.DisplayName || 'FotelVándor'}</title>
      </Helmet>

      <header className="fotel-r5__header">
        <div className="fotel-r5__header-inner">
          <Link className="fotel-r5__brand" to="/" aria-label="Kezdőlap">
            {logoOk ? (
              <img
                className="fotel-r5__brand-logo"
                src={logoUrl}
                alt=""
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="fotel-r5__brand-fallback">
                {context?.Workspace?.DisplayName || context?.DisplayName || 'Home'}
              </span>
            )}
          </Link>
          <nav className="fotel-r5__nav" aria-label="Főmenü">
            {navItems.map((item) =>
              item.external ? (
                <a key={item.id} href={item.path} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.id}
                  to={item.path}
                  className={isActive(item.path) ? 'on' : undefined}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
          <form className="fotel-r5__search" role="search" onSubmit={(e) => e.preventDefault()}>
            <span aria-hidden>⌕</span>
            <input type="search" placeholder="Keresés…" aria-label="Keresés" />
          </form>
        </div>
      </header>

      {heroEssay ? (
        <section className="fotel-r5__hero">
          <div
            className={`fotel-r5__hero-bg${heroEssay.image ? '' : ' fotel-r5__hero-bg--empty'}`}
            style={heroEssay.image ? { backgroundImage: `url('${heroEssay.image}')` } : undefined}
            role="img"
            aria-label={heroEssay.title}
          />
          <div className="fotel-r5__hero-inner">
            <div className="fotel-r5__hero-copy">
              <div className="fotel-r5__kicker">Kiemelt esszé · fold</div>
              <h1>{heroEssay.title}</h1>
              <div className="fotel-r5__meta">
                <span className="fotel-r5__chip o">{heroEssay.category}</span>
                {heroEssay.meta ? <span className="fotel-r5__chip">{heroEssay.meta}</span> : null}
                {heroEssay.date ? <span className="fotel-r5__chip">{heroEssay.date}</span> : null}
              </div>
              {heroEssay.lead ? <p>{heroEssay.lead}</p> : null}
              <div className="fotel-r5__actions">
                <Link className="fotel-r5__btn" to={heroEssay.path}>Teljes esszé →</Link>
                <Link className="fotel-r5__btn ghost" to={archivePath}>Visszatekintés</Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="fotel-r5__stage">
        <div className="fotel-r5__float">
          {iconItems.length > 0 ? (
            <div className="fotel-r5__icons">
              {iconItems.map((icon) => (
                <Link key={icon.id} className="fotel-r5__icon" to={icon.path}>
                  <div className="c">
                    {icon.iconClass ? <i className={`fa ${icon.iconClass}`} aria-hidden /> : '·'}
                  </div>
                  <span>{icon.label}</span>
                </Link>
              ))}
            </div>
          ) : null}

          {trips.length > 0 ? (
            <>
              <div className="fotel-r5__sec-h">
                <h2>Kiemelt utazások</h2>
                {navItems[1] ? <Link to={navItems[1].path}>Összes →</Link> : null}
              </div>
              <div className="fotel-r5__trips">
                {trips.map((trip) => (
                  <Link key={trip.id} className="fotel-r5__trip" to={trip.path}>
                    <div
                      className={`fotel-r5__trip-shot${trip.image ? '' : ' fotel-r5__trip-shot--empty'}`}
                      style={trip.image ? { backgroundImage: `url('${trip.image}')` } : undefined}
                    >
                      <span className="fotel-r5__trip-tag">{trip.tag}</span>
                    </div>
                    <div className="fotel-r5__trip-body">
                      <h3>{trip.title}</h3>
                      {trip.subtitle ? <p>{trip.subtitle}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          <div className="fotel-r5__split">
            <div>
              {collectionThumbs.length > 0 ? (
                <>
                  <div className="fotel-r5__sec-h">
                    <h2>Tematikus gyűjtemények</h2>
                    {navItems.find((n) => /sorozat/i.test(n.label)) ? (
                      <Link to={navItems.find((n) => /sorozat/i.test(n.label)).path}>Böngészés →</Link>
                    ) : null}
                  </div>
                  <div className="fotel-r5__collect">
                    <h3>Friss borítók</h3>
                    <div className="fotel-r5__thumbs">
                      {collectionThumbs.map((t) =>
                        t.image ? (
                          <Link key={t.id} to={t.path}>
                            <img src={t.image} alt={t.title || ''} />
                          </Link>
                        ) : (
                          <div key={t.id} className="fotel-r5__thumb--empty" style={{ width: 72, height: 96, borderRadius: 6 }} />
                        )
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {latest.length > 0 ? (
                <>
                  <div className="fotel-r5__sec-h" style={{ marginTop: 22 }}>
                    <h2>Legfrissebb kalandok</h2>
                  </div>
                  <div>
                    {latest.map((row) => (
                      <div className="fotel-r5__latest-row" key={row.id}>
                        <div
                          className={`fotel-r5__latest-thumb${row.image ? '' : ' fotel-r5__latest-thumb--empty'}`}
                          style={row.image ? { backgroundImage: `url('${row.image}')` } : undefined}
                        />
                        <div>
                          <h3>{row.title}</h3>
                          {row.subtitle ? <p>{row.subtitle}</p> : null}
                        </div>
                        <Link className="fotel-r5__btn-sm" to={row.path}>Olvasás</Link>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div>
              <div className="fotel-r5__archive">
                <h3>Van mit olvasni</h3>
                <p>Ritka megjelenés — a Visszatekintés a fő bejárat az archívumba.</p>
                <Link className="fotel-r5__btn" to={archivePath}>Visszatekintés →</Link>
              </div>
              {demotedNews.length > 0 ? (
                <div className="fotel-r5__news">
                  <div className="fotel-r5__news-note">Hírek · demoted</div>
                  <h3>Hírek</h3>
                  {demotedNews.map((item) => (
                    <div className="fotel-r5__news-item" key={item.id}>
                      <Link to={item.path}>{item.title}</Link>
                      {item.date ? <span>{item.date}</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* ECM widgets (side/content) still available for banners / lists */}
          {safeWidgets.length > 0 ? (
            <div className="fotel-r5__zone">
              <CachedComponentsByZone type="widgets" zone="content" widgets={safeWidgets} context={context} />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="fotel-r5__footer">
        {context?.Workspace?.DisplayName || context?.DisplayName || 'FotelVándor'}
      </footer>
    </div>
  );
});

export default FotelR5Layout;
