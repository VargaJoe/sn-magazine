import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useRepository } from '@sensenet/hooks-react';
import { CachedComponentsByZone } from '../utils/add-component';
import { useSnStore } from '../store/sn-store';
import deepEqual from '../utils/deep-equal';

const STOCK = {
  hero: '/fotel-r5/fotel-r5-hero.jpg',
  dune: '/fotel-r5/r5-cover-dune.jpg',
  dragon: '/fotel-r5/r5-cover-dragon.jpg',
  map: '/fotel-r5/r5-cover-map.jpg',
  latest: '/fotel-r5/r5-cover-latest.jpg',
  scifi1: '/fotel-r5/r5-cover-scifi1.jpg',
  scifi2: '/fotel-r5/r5-cover-scifi2.jpg',
};

const FALLBACK_NAV = [
  { label: 'Főoldal', path: '/', match: 'home' },
  { label: 'Filmek', path: '/Filmek', nameHints: ['Filmek', 'Film'] },
  { label: 'Könyvek', path: '/Konyvek', nameHints: ['Könyvek', 'Konyvek', 'Könyv'] },
  { label: 'Játékkönyvek', path: '/Jatekonyvek', nameHints: ['Játékkönyvek', 'Jatekkonyvek', 'Játékkönyv'] },
  { label: 'Sorozat', path: '/Sorozat', nameHints: ['Sorozat', 'Sorozatok'] },
  { label: 'Visszatekintés', path: '/Visszatekintes', nameHints: ['Visszatekintés', 'Visszatekintes', 'Archívum', 'Archivum'] },
];

const FALLBACK_ICONS = [
  { label: 'Film', emoji: '🎬', path: '/Filmek', on: true },
  { label: 'Könyv', emoji: '📖', path: '/Konyvek' },
  { label: 'Játékkönyv', emoji: '🎲', path: '/Jatekonyvek' },
  { label: 'Sorozat', emoji: '📺', path: '/Sorozat' },
  { label: 'Archívum', emoji: '🕘', path: '/Visszatekintes' },
];

const FALLBACK_TRIPS = [
  { title: 'Dűne', subtitle: 'Homok, gépek, és a fotel mint űrhajó.', tag: 'Film', image: STOCK.dune, path: '/Filmek' },
  { title: 'A Sárkányok Könyve', subtitle: 'Fantasy esszé — cover first.', tag: 'Könyv', image: STOCK.dragon, path: '/Konyvek' },
  { title: 'Válassz! — interaktív', subtitle: 'Térkép a következő útra.', tag: 'Játékkönyv', image: STOCK.map, path: '/Jatekonyvek' },
];

const FALLBACK_LATEST = [
  { title: 'Játékkönyv klasszikusok', subtitle: 'Rövid teaser — ritka pub, erős archívum.', image: STOCK.latest, path: '/Jatekonyvek' },
  { title: 'Senki gyűjtemény', subtitle: 'Öt év, egy polc.', image: STOCK.map, path: '/Visszatekintes' },
];

const FALLBACK_NEWS = [
  { title: 'Megújult külső', date: '2023.11.02' },
  { title: 'A motorháztető alatt', date: '2021.08.14' },
  { title: 'Magányos Farkas', date: '2021.03.20' },
];

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

function guessCategoryLabel(name = '') {
  const n = name.toLowerCase();
  if (n.includes('film')) return 'Film';
  if (n.includes('könyv') || n.includes('konyv') || n.includes('book')) return 'Könyv';
  if (n.includes('játék') || n.includes('jatek') || n.includes('game')) return 'Játékkönyv';
  if (n.includes('sorozat') || n.includes('series')) return 'Sorozat';
  return 'Esszé';
}

/**
 * FotelVándor R5 homepage layout — magazine chrome matching docs/design-r5 lock.
 * PageTemplate name: fotel-r5
 * SenseNet: categories / recent reviews enrich placeholders when available.
 */
export const FotelR5Layout = React.memo((props) => {
  const { context, widgets } = useSnStore((state) => state, deepEqual);
  const repo = useRepository();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newsItems, setNewsItems] = useState([]);

  const dataPath = process.env.REACT_APP_DATA_PATH || '/Root/Content/fotelvandor';

  const loadHomeData = useCallback(async () => {
    if (!repo) return;
    try {
      const cats = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query: 'TypeIs:LeisureCategory OR TypeIs:Folder',
          select: ['Id', 'Name', 'DisplayName', 'Path', 'Index', 'IconName'],
          orderby: ['Index', 'DisplayName'],
          top: 20,
          metadata: 'no',
        },
      });
      setCategories(cats?.d?.results || []);
    } catch (e) {
      console.warn('[fotel-r5] categories fallback', e?.message || e);
    }

    try {
      const reviews = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query: 'TypeIs:LeisureBookReview OR TypeIs:LeisureArticle OR TypeIs:Article',
          select: 'all',
          orderby: [['PublishDate', 'desc'], ['ModificationDate', 'desc']],
          top: 8,
          metadata: 'no',
        },
      });
      setFeatured(reviews?.d?.results || []);
    } catch (e) {
      console.warn('[fotel-r5] featured fallback', e?.message || e);
    }

    try {
      const news = await repo.loadCollection({
        path: dataPath,
        oDataOptions: {
          query: "TypeIs:LeisureArticle AND (InFolder:'" + dataPath + "/Hirek' OR InFolder:'" + dataPath + "/News' OR DisplayName:*)",
          select: ['Id', 'Name', 'DisplayName', 'Path', 'PublishDate', 'ModificationDate'],
          orderby: [['PublishDate', 'desc']],
          top: 3,
          metadata: 'no',
        },
      });
      // Prefer items under Hirek if present; else keep empty so demoted placeholders show
      const results = news?.d?.results || [];
      const hirek = results.filter((r) => /hirek|hírek|news/i.test(r.Path || ''));
      setNewsItems(hirek.length ? hirek : []);
    } catch (e) {
      console.warn('[fotel-r5] news fallback', e?.message || e);
    }
  }, [repo, dataPath]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const navItems = useMemo(() => {
    return FALLBACK_NAV.map((item) => {
      if (item.match === 'home') return { ...item, path: '/' };
      const hit = categories.find((c) =>
        (item.nameHints || []).some((h) =>
          (c.Name || '').toLowerCase().includes(h.toLowerCase()) ||
          (c.DisplayName || '').toLowerCase().includes(h.toLowerCase())
        )
      );
      if (hit) {
        return { ...item, path: relativePath(hit.Path), label: hit.DisplayName || item.label };
      }
      return item;
    });
  }, [categories]);

  const iconItems = useMemo(() => {
    return FALLBACK_ICONS.map((icon) => {
      const hit = categories.find((c) =>
        (c.DisplayName || '').toLowerCase().includes(icon.label.toLowerCase()) ||
        (c.Name || '').toLowerCase().includes(icon.label.toLowerCase().slice(0, 4))
      );
      return hit
        ? { ...icon, path: relativePath(hit.Path), label: hit.DisplayName || icon.label }
        : icon;
    });
  }, [categories]);

  const heroEssay = useMemo(() => {
    const first = featured[0];
    if (!first) {
      return {
        title: 'Kritikus szemmel könyvekről, filmekről és játékkönyvekről.',
        lead: 'Homepage = kirakat. A foldon erős kép + egy esszé — nem hírek, nem dump.',
        category: 'Könyv',
        meta: 'I, Robot · ~18 perc',
        date: '2026.09.05',
        path: '/Visszatekintes',
        image: STOCK.hero,
        isStock: true,
      };
    }
    const dateSrc = first.PublishDate || first.ModificationDate;
    const date = dateSrc
      ? new Date(dateSrc).toISOString().slice(0, 10).replace(/-/g, '.')
      : '';
    return {
      title: first.DisplayName || first.Name,
      lead: first.Description || first.Lead || first.Subtitle || 'Kiemelt esszé a fotelből.',
      category: guessCategoryLabel(first.DisplayName || first.Name || ''),
      meta: first.Author ? `${first.Author}` : 'Esszé',
      date,
      path: relativePath(first.Path),
      image: mediaUrl(first) || STOCK.hero,
      isStock: !mediaUrl(first),
    };
  }, [featured]);

  const trips = useMemo(() => {
    if (featured.length >= 3) {
      return featured.slice(0, 3).map((item, idx) => ({
        title: item.DisplayName || item.Name,
        subtitle: item.Description || item.Lead || FALLBACK_TRIPS[idx]?.subtitle || '',
        tag: guessCategoryLabel(item.DisplayName || item.Name || ''),
        image: mediaUrl(item) || FALLBACK_TRIPS[idx]?.image || STOCK.dune,
        path: relativePath(item.Path),
      }));
    }
    return FALLBACK_TRIPS;
  }, [featured]);

  const latest = useMemo(() => {
    if (featured.length >= 2) {
      return featured.slice(0, 2).map((item, idx) => ({
        title: item.DisplayName || item.Name,
        subtitle: item.Description || item.Lead || FALLBACK_LATEST[idx]?.subtitle || '',
        image: mediaUrl(item) || FALLBACK_LATEST[idx]?.image || STOCK.latest,
        path: relativePath(item.Path),
      }));
    }
    return FALLBACK_LATEST;
  }, [featured]);

  const demotedNews = useMemo(() => {
    if (newsItems.length) {
      return newsItems.slice(0, 3).map((n) => ({
        title: n.DisplayName || n.Name,
        date: n.PublishDate
          ? new Date(n.PublishDate).toISOString().slice(0, 10).replace(/-/g, '.')
          : '',
        path: relativePath(n.Path),
      }));
    }
    return FALLBACK_NEWS;
  }, [newsItems]);

  const archivePath = navItems.find((n) => /vissza|archív|archiv/i.test(n.label))?.path || '/Visszatekintes';
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname.toLowerCase().startsWith(path.toLowerCase());
  };

  const safeWidgets = Array.isArray(widgets) ? widgets : [];

  return (
    <div className="fotel-r5 App">
      <Helmet>
        <link rel="stylesheet" href="/Fotel-R5.css" />
        <title>{context?.DisplayName || 'FotelVándor'}</title>
        <meta name="theme-color" content="#E87A2E" />
      </Helmet>

      <div className="fotel-r5__stock">STOCK placeholder covers · layout demo</div>

      <header className="fotel-r5__header">
        <div className="fotel-r5__header-inner">
          <Link className="fotel-r5__brand" to="/">
            <div className="fotel-r5__mark" aria-hidden>🪑</div>
            <div>
              <div className="fotel-r5__name">Fotel<span>Vándor</span></div>
              <span className="fotel-r5__tag">Kalandtúra a csomagban</span>
            </div>
          </Link>
          <nav className="fotel-r5__nav" aria-label="Főmenü">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={isActive(item.path) ? 'on' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form className="fotel-r5__search" role="search" onSubmit={(e) => e.preventDefault()}>
            <span aria-hidden>⌕</span>
            <input type="search" placeholder="Keresés…" aria-label="Keresés" />
          </form>
        </div>
      </header>

      <section className="fotel-r5__hero">
        <div
          className="fotel-r5__hero-bg"
          style={{ backgroundImage: `url('${heroEssay.image}')` }}
          role="img"
          aria-label={heroEssay.isStock ? 'STOCK hero' : heroEssay.title}
        />
        <div className="fotel-r5__hero-inner">
          <div className="fotel-r5__hero-copy">
            <div className="fotel-r5__kicker">Kiemelt esszé · fold</div>
            <h1>{heroEssay.title}</h1>
            <div className="fotel-r5__meta">
              <span className="fotel-r5__chip o">{heroEssay.category}</span>
              <span className="fotel-r5__chip">{heroEssay.meta}</span>
              {heroEssay.date ? <span className="fotel-r5__chip">{heroEssay.date}</span> : null}
            </div>
            <p>{heroEssay.lead}</p>
            <div className="fotel-r5__actions">
              <Link className="fotel-r5__btn" to={heroEssay.path}>Teljes esszé →</Link>
              <Link className="fotel-r5__btn ghost" to={archivePath}>Visszatekintés</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="fotel-r5__stage">
        <div className="fotel-r5__float">
          <div className="fotel-r5__icons">
            {iconItems.map((icon) => (
              <Link
                key={icon.label}
                className={`fotel-r5__icon${icon.on ? ' on' : ''}`}
                to={icon.path}
              >
                <div className="c">{icon.emoji}</div>
                <span>{icon.label}</span>
              </Link>
            ))}
          </div>

          <div className="fotel-r5__sec-h">
            <h2>Kiemelt utazások</h2>
            <Link to={navItems[1]?.path || '/Filmek'}>Összes →</Link>
          </div>
          <div className="fotel-r5__trips">
            {trips.map((trip) => (
              <Link key={trip.title} className="fotel-r5__trip" to={trip.path}>
                <div
                  className="fotel-r5__trip-shot"
                  style={{ backgroundImage: `url('${trip.image}')` }}
                >
                  <span className="fotel-r5__trip-tag">{trip.tag}</span>
                </div>
                <div className="fotel-r5__trip-body">
                  <h3>{trip.title}</h3>
                  <p>{trip.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="fotel-r5__split">
            <div>
              <div className="fotel-r5__sec-h">
                <h2>Tematikus gyűjtemények</h2>
                <Link to={navItems.find((n) => /sorozat/i.test(n.label))?.path || '/Sorozat'}>
                  Böngészés →
                </Link>
              </div>
              <div className="fotel-r5__collect">
                <h3>Top sci-fi sorozatok</h3>
                <div className="fotel-r5__thumbs">
                  <img src={STOCK.scifi1} alt="" />
                  <img src={STOCK.scifi2} alt="" />
                  <img src={STOCK.dune} alt="" />
                </div>
              </div>

              <div className="fotel-r5__sec-h" style={{ marginTop: 22 }}>
                <h2>Legfrissebb kalandok</h2>
              </div>
              <div>
                {latest.map((row) => (
                  <div className="fotel-r5__latest-row" key={row.title}>
                    <div
                      className="fotel-r5__latest-thumb"
                      style={{ backgroundImage: `url('${row.image}')` }}
                    />
                    <div>
                      <h3>{row.title}</h3>
                      <p>{row.subtitle}</p>
                    </div>
                    <Link className="fotel-r5__btn-sm" to={row.path}>Olvasás</Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="fotel-r5__archive">
                <h3>Van mit olvasni</h3>
                <p>Ritka megjelenés — a Visszatekintés a fő bejárat az archívumba.</p>
                <Link className="fotel-r5__btn" to={archivePath}>Visszatekintés →</Link>
              </div>
              <div className="fotel-r5__news">
                <div className="fotel-r5__news-note">Hírek · demoted</div>
                <h3>Hírek</h3>
                {demotedNews.map((item) => (
                  <div className="fotel-r5__news-item" key={item.title}>
                    {item.path ? <Link to={item.path}>{item.title}</Link> : item.title}
                    {item.date ? <span>{item.date}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optional ECM widgets still render below the curated chrome */}
          {safeWidgets.length > 0 ? (
            <div className="fotel-r5__zone">
              <CachedComponentsByZone type="widgets" zone="content" widgets={safeWidgets} context={context} />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="fotel-r5__footer">
        FotelVándor · PlasticE · sister → MANGAjánló (később)
      </footer>
    </div>
  );
});

export default FotelR5Layout;
