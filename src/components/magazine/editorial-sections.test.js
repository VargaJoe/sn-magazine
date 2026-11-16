import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useMagazine } from './provider';
import { createEditorialLayer } from './editorial-layer';
import { publishedItems } from './model';
import { EditorialCategory, EditorialHub, EditorialCollections, EditorialArticleContext } from './editorial-sections';

jest.mock('./provider', () => ({ ...jest.requireActual('./provider'), useMagazine: jest.fn() }));

const rootPath = '/Root/Content/Magazine';
const editorialRoot = `${rootPath}/(editorial)`;
const books = { Id: 900, Type: 'LeisureCategory', Path: `${rootPath}/Books`, DisplayName: 'Könyvek' };
const news = { Id: 901, Type: 'LeisureCategory', Path: `${rootPath}/News`, DisplayName: 'Hírek' };
const hubPage = { Id: 902, Type: 'SmartFolder', Path: `${rootPath}/Gyujtemenyek/Kalandozas`, DisplayName: 'Kalandozás' };
const collectionsPage = { Id: 903, Type: 'Page', Path: `${rootPath}/Gyujtemenyek`, DisplayName: 'Gyűjtemények' };
const item = (Id, fields = {}) => ({ Id, Type: 'EditorialItem', Path: `${editorialRoot}/Items/i-${Id}`,
  DisplayName: `Tétel ${Id}`, IsListed: true, MediaKind: 'book', ItemScope: 'edition', ...fields });
const collection = (Id, fields = {}) => ({ Id, Type: 'EditorialCollection', Path: `${editorialRoot}/Collections/c-${Id}`,
  DisplayName: `Gyűjtemény ${Id}`, IsListed: true, OrderMode: 'manual', ...fields });
const review = (Id, fields = {}) => ({ Id, Type: 'LeisureBookReview', Path: `${books.Path}/r-${Id}`,
  DisplayName: `Ismertető ${Id}`, PublishDate: '2025-01-01T12:00:00Z', ...fields });
const membership = (Id, Item, Collection, Position, NumberLabel = '') => ({ Id, Type: 'EditorialMembership',
  Path: `${editorialRoot}/Memberships/m-${Id}`, Item, Collection, Position, NumberLabel });
const annotation = (Id, Target, Items, fields = {}) => ({ Id, Type: 'EditorialAnnotation',
  Path: `${rootPath}/(structure)/Editorial/a-${Id}`, Target, Items, ...fields });
const titleTexts = container => [...container.querySelectorAll('.rm-title')].map(node => node.textContent);
const row = (container, id) => container.querySelector(`[data-editorial-item="${id}"]`);

describe('explicit editorial reader views', () => {
  let container, root, state, data, location;
  const originalRoot = process.env.REACT_APP_DATA_PATH;
  const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
  // ReactDOM createRoot requires act; this is not a Testing Library render helper.
  function LocationProbe() { location = useLocation(); return null; }
  // eslint-disable-next-line testing-library/no-unnecessary-act
  const render = async (element, initial = '/Gyujtemenyek') => act(async () => root.render(
    <MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LocationProbe />{element}</MemoryRouter>));
  const change = async (select, value) => act(async () => {
    select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const click = async element => act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  const rebuild = () => { state.editorial = createEditorialLayer({ root: rootPath, editorialRoot, ...data }); };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T12:00:00Z'));
    process.env.REACT_APP_DATA_PATH = rootPath;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    const first = item(1, { EditionLabel: 'Első kiadás', PublisherLabel: 'Tételkiadó', ImprintLabel: 'Kiadói műhely' });
    const second = item(2); const parentOnly = item(3); const unassigned = item(4);
    const hub = collection(100, { DisplayName: 'Kalandozás', Kind: 'series', OrderMode: 'unordered', HubPage: hubPage });
    const child = collection(101, { DisplayName: 'Kiadói rend', ParentCollection: hub });
    const sibling = collection(102, { DisplayName: 'Eredeti rend', ParentCollection: hub });
    const author = { Id: 2000, Path: `${rootPath}/Authors/one`, DisplayName: 'Mintaszerző' };
    const firstReview = review(10, { DisplayName: 'Alfa ismertető', PublishDate: '2023-01-01T12:00:00Z', BookAuthor: [author], Publisher: 'Cikkforrás' });
    const latestReview = review(11, { DisplayName: 'Zéta ismertető', PublishDate: '2025-01-01T12:00:00Z', BookAuthor: [author] });
    const multiReview = review(12, { DisplayName: 'Közös ismertető', PublishDate: '2024-01-01T12:00:00Z' });
    const ungrouped = review(13, { DisplayName: 'Csoport nélküli ismertető', Series: 'Régi kitalált sorozat' });
    const hidden = review(14, { DisplayName: 'Titkos ismertető', Hidden: true });
    const future = review(15, { DisplayName: 'Jövőbeli ismertető', PublishDate: '2027-01-01T12:00:00Z' });
    const other = review(16, { DisplayName: 'Más rovat írása', Path: `${rootPath}/Cinema/other` });
    const newsReview = review(17, { DisplayName: 'Nyilvános hír', Path: `${news.Path}/one` });
    data = { items: [first, second, parentOnly, unassigned], collections: [hub, child, sibling],
      memberships: [membership(200, first, child, 1, 'I/A'), membership(201, second, child, 2, 'II/B'),
        membership(202, parentOnly, hub, null, 'Szülőcímke'), membership(203, first, sibling, 8, 'FF-8')],
      articles: [firstReview, latestReview, multiReview, ungrouped, hidden, future, other, newsReview],
      annotations: [annotation(300, firstReview, first), annotation(301, latestReview, first),
        annotation(302, multiReview, [first, parentOnly]), annotation(303, ungrouped, unassigned, { PublisherGroup: 'Régi kitalált sorozat' }),
        annotation(304, hidden, second), annotation(305, future, second)] };
    state = { root: rootPath, context: hubPage, categories: [books, news], annotations: [], items: [],
      articles: publishedItems(data.articles, rootPath), stories: publishedItems(data.articles, rootPath).filter(article => !article.Path.startsWith(news.Path + '/')),
      source: { NewsRoot: [news], CollectionsPage: [collectionsPage] },
      routeFor: role => role === 'CollectionsPage' ? '/Gyujtemenyek' : '', loading: false, error: false };
    rebuild(); useMagazine.mockImplementation(() => state);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks();
  });
  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalAct;
    if (originalRoot === undefined) delete process.env.REACT_APP_DATA_PATH; else process.env.REACT_APP_DATA_PATH = originalRoot;
  });

  test('hub separates unique counts, explicit labels, parent-only unplaced items and honest unreviewed placeholders', async () => {
    state.source.DefaultBrowseView = 'collections';
    await render(<EditorialHub />);
    expect(container.textContent).toContain('3 ismertető');
    expect(container.textContent).toContain('3 nyilvántartott tétel');
    expect(container.querySelector('select').value).toBe('100');
    await change(container.querySelector('select'), '102');
    expect(row(container, 1).querySelector('.rm-editorial-number').textContent).toBe('FF-8');
    // The configured collections view chooses a child by data, never a publisher-specific role.
    await change(container.querySelector('select'), '101');
    expect(row(container, 1).querySelector('.rm-editorial-number').textContent).toBe('I/A');
    expect(row(container, 2).querySelector('.rm-editorial-number').textContent).toBe('II/B');
    expect(row(container, 2).querySelector('a')).toBeNull();
    expect(row(container, 2).textContent).toContain('Még nincs ismertető');
    expect(container.querySelector('.rm-unplaced').textContent).toContain('Tétel 3');
    expect(row(container, 3).querySelector('.rm-editorial-number').textContent).toBe('—');
    expect(container.textContent).not.toContain('Szülőcímke');
    expect(row(container, 4)).toBeNull();
    expect(container.textContent).not.toMatch(/Titkos ismertető|Jövőbeli ismertető/);
    await change(container.querySelector('select'), '102');
    expect(container.querySelector('.rm-unplaced').textContent).toContain('Tétel 2');
    expect(container.textContent).not.toContain('II/B');
  });

  test('hub defaults to publication order, deduplicates multi-item reviews and sorts by publication dates', async () => {
    await render(<EditorialHub />);
    expect(container.querySelector('select').value).toBe('publication');
    expect(titleTexts(container)).toEqual(['Zéta ismertető', 'Közös ismertető', 'Alfa ismertető']);
    expect(container.querySelectorAll('[data-editorial-item]')).toHaveLength(0);
    expect(container.textContent).toContain('3 nyilvántartott tétel');
    await change(container.querySelectorAll('select')[1], 'oldest');
    expect(titleTexts(container)).toEqual(['Alfa ismertető', 'Közös ismertető', 'Zéta ismertető']);
  });

  test('category keeps ungrouped public stories and ignores legacy series, hidden content, news and other categories', async () => {
    state.context = books; state.stories = data.articles;
    state.source.DefaultBrowseView = ['collections'];
    await render(<EditorialCategory books />);
    expect([...container.querySelectorAll('h2')].map(node => node.textContent)).toEqual(['Kalandozás', 'További írások']);
    expect(container.querySelectorAll('.rm-book')).toHaveLength(4);
    expect(container.textContent).toContain('Csoport nélküli ismertető');
    expect(container.textContent).not.toMatch(/Régi kitalált sorozat|Titkos ismertető|Jövőbeli ismertető|Nyilvános hír|Más rovat írása/);
    await change(container.querySelectorAll('select')[1], 'title');
    await change(container.querySelector('select'), 'publication');
    expect(titleTexts(container)).toEqual(['Alfa ismertető', 'Csoport nélküli ismertető', 'Közös ismertető', 'Zéta ismertető']);
  });

  test('category defaults to publication and responds to changed CMS browse settings', async () => {
    state.context = books;
    await render(<EditorialCategory books />);
    expect(container.querySelector('select').value).toBe('publication');
    expect(titleTexts(container)).toEqual(['Zéta ismertető', 'Csoport nélküli ismertető', 'Közös ismertető', 'Alfa ismertető']);
    expect(container.querySelectorAll('h2')).toHaveLength(0);

    state.source = { ...state.source, DefaultBrowseView: ['collections'] };
    await render(<EditorialCategory books />);
    expect(container.querySelector('select').value).toBe('groups');
    expect([...container.querySelectorAll('h2')].map(node => node.textContent)).toEqual(['Kalandozás', 'További írások']);

    state.source = { ...state.source, DefaultBrowseView: 'publication' };
    await render(<EditorialCategory books />);
    expect(container.querySelector('select').value).toBe('publication');
    expect(titleTexts(container)).toHaveLength(4);
  });

  test('a hub responds to changed CMS browse settings without retaining the previous default', async () => {
    await render(<EditorialHub />);
    expect(container.querySelector('select').value).toBe('publication');
    state.source = { ...state.source, DefaultBrowseView: ['collections'] };
    await render(<EditorialHub />);
    expect(container.querySelector('select').value).toBe('100');
    expect(container.querySelectorAll('[data-editorial-item]')).toHaveLength(3);
    expect(container.querySelectorAll('.rm-editorial-number')).toHaveLength(0);
    state.source = { ...state.source, DefaultBrowseView: 'publication' };
    await render(<EditorialHub />);
    expect(container.querySelector('select').value).toBe('publication');
    expect(container.querySelectorAll('[data-editorial-item]')).toHaveLength(0);
  });

  test('the news category uses its public article pool even when ordinary stories omit news', async () => {
    state.context = news;
    await render(<EditorialCategory />);
    expect(titleTexts(container)).toEqual(['Nyilvános hír']);
  });

  test('collections link only to their direct HubPage and leave unmapped collections readable without links', async () => {
    state.context = collectionsPage;
    const unmapped = collection(500, { DisplayName: 'Önálló válogatás', OrderMode: 'unordered' });
    data.collections.push(unmapped);
    state.items.push({ Id: 980, Type: 'SmartFolder', Path: `${rootPath}/Same-title`, DisplayName: unmapped.DisplayName });
    rebuild();
    await render(<EditorialCollections />);
    const links = [...container.querySelectorAll('h3 a')];
    expect(links.find(link => link.textContent === 'Kalandozás').getAttribute('href')).toBe('/Gyujtemenyek/Kalandozas');
    const heading = [...container.querySelectorAll('h3')].find(node => node.textContent === unmapped.DisplayName);
    expect(heading).toBeDefined();
    expect(heading.querySelector('a')).toBeNull();
    expect(links.every(link => !link.hash)).toBe(true);
    expect(links.some(link => /Régi kitalált sorozat/.test(link.textContent))).toBe(false);
  });

  test('configured native directories supply author labels and routes and filter foreign, hidden and nonchild pages', async () => {
    state.context = collectionsPage;
    const directory = { Id: 910, Type: 'Folder', Path: `${rootPath}/Alkotok`, DisplayName: 'Alkotók és mesélők' };
    const authorPage = { Id: 911, Type: 'SmartFolder', Path: `${directory.Path}/ursula-le-guin`, DisplayName: 'Ursula K. Le Guin' };
    const page = { Id: 912, Type: 'Page', Path: `${directory.Path}/page`, DisplayName: 'Szerzői bemutatkozás' };
    const category = { Id: 913, Type: 'LeisureCategory', Path: `${directory.Path}/category`, DisplayName: 'Alkotói rovat' };
    const foreignDirectory = { ...directory, Id: 940, Path: '/Root/Other/Authors', DisplayName: 'Idegen könyvtár' };
    state.source.CollectionRoots = { results: [directory, foreignDirectory, { ...directory, Id: 941, Hidden: true, DisplayName: 'Rejtett könyvtár' }] };
    state.items = [authorPage, page, category,
      { ...authorPage, Id: 920, Path: `${directory.Path}/hidden`, DisplayName: 'Rejtett szerző', Hidden: true },
      { ...authorPage, Id: 921, Path: `${directory.Path}/nested/author`, DisplayName: 'Mélyebben tárolt szerző' },
      { ...authorPage, Id: 922, Path: `${directory.Path}/(technical)`, DisplayName: 'Technikai oldal' },
      { ...authorPage, Id: 923, Path: `${foreignDirectory.Path}/foreign`, DisplayName: 'Idegen szerző' },
      { ...authorPage, Id: 924, Type: 'Folder', Path: `${directory.Path}/folder`, DisplayName: 'Belső mappa' },
    ];
    await render(<EditorialCollections />);
    expect(container.textContent).toContain(directory.DisplayName);
    const author = [...container.querySelectorAll('h3 a')].find(link => link.textContent === authorPage.DisplayName);
    expect(author.getAttribute('href')).toBe('/Alkotok/ursula-le-guin');
    [page, category].forEach(node => expect([...container.querySelectorAll('h3 a')].some(link => link.textContent === node.DisplayName)).toBe(true));
    expect(container.textContent).not.toMatch(/Mintaszerző|Rejtett szerző|Mélyebben tárolt szerző|Technikai oldal|Idegen szerző|Belső mappa|Idegen könyvtár|Rejtett könyvtár/);
    await click(author);
    expect(location.pathname).toBe('/Alkotok/ursula-le-guin');
    expect(location.hash).toBe('');
  });

  test('a configured native hub card replaces the duplicate root collection card and keeps explicit counts', async () => {
    state.context = collectionsPage;
    const directory = { Id: 910, Type: 'Folder', Path: `${rootPath}/Vilagok`, DisplayName: 'Világok' };
    const nativePage = { ...hubPage, Path: `${directory.Path}/kalandozas`, DisplayName: 'A kalandozók kapuja' };
    data.collections[0].HubPage = nativePage;
    state.source.CollectionRoots = [directory]; state.items = [nativePage]; rebuild();
    await render(<EditorialCollections />);
    const links = [...container.querySelectorAll('h3 a')].filter(link => link.getAttribute('href') === '/Vilagok/kalandozas');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe(nativePage.DisplayName);
    const card = links[0].closest('article');
    expect(card.textContent).toContain('3 ismertető');
    expect(card.textContent).toContain('3 nyilvántartott tétel');
  });

  test('a native directory page lists only its immediate configured children and provides a native return link', async () => {
    const directory = { Id: 910, Type: 'Folder', Path: `${rootPath}/Alkotok`, DisplayName: 'Alkotók' };
    const authorPage = { Id: 911, Type: 'SmartFolder', Path: `${directory.Path}/a-szerzo`, DisplayName: 'Egy szerző' };
    const otherDirectory = { ...directory, Id: 920, Path: `${rootPath}/Vilagok`, DisplayName: 'Világok' };
    state.context = directory;
    state.source.CollectionRoots = [directory, otherDirectory];
    state.items = [authorPage, { ...authorPage, Id: 921, Path: `${otherDirectory.Path}/egy-vilag`, DisplayName: 'Más könyvtár oldala' }];
    await render(<EditorialCollections />, '/Alkotok');
    expect(container.querySelector('h1').textContent).toBe('Alkotók');
    expect([...container.querySelectorAll('h3 a')].map(link => link.getAttribute('href'))).toEqual(['/Alkotok/a-szerzo']);
    expect(container.textContent).not.toMatch(/Kalandozás|Tétel 4|Más könyvtár oldala/);
    expect(container.querySelector('.rm-action').getAttribute('href')).toBe('/Gyujtemenyek');
  });

  test('a native child HubPage selects its own order while preserving the parent pool', async () => {
    const childPage = { ...hubPage, Id: 904, Path: `${hubPage.Path}/kiadoi-rend`, DisplayName: 'Kiadói rend' };
    data.collections[1].HubPage = childPage; state.context = childPage; rebuild();
    await render(<EditorialHub />, '/Gyujtemenyek/Kalandozas/kiadoi-rend#reader-main');
    expect(container.querySelector('h1').textContent).toBe('Kiadói rend');
    expect(container.querySelector('select').value).toBe('101');
    expect(row(container, 1).querySelector('.rm-editorial-number').textContent).toBe('I/A');
    expect(container.querySelector('.rm-unplaced').textContent).toContain('Tétel 3');
    expect(container.textContent).toContain('3 nyilvántartott tétel');
    state.source = { ...state.source, DefaultBrowseView: 'publication' };
    await render(<EditorialHub />);
    expect(container.querySelector('select').value).toBe('101');
  });

  test('a native deep descendant hub selects its order without adding unrelated branch choices', async () => {
    const deepPage = { ...hubPage, Id: 905, Path: `${hubPage.Path}/melyebb-rend`, DisplayName: 'Mélyebb rend' };
    const grandchild = collection(103, { DisplayName: 'Mélyebb rend', ParentCollection: data.collections[1], HubPage: deepPage });
    const unrelated = collection(500, { DisplayName: 'Másik ág', OrderMode: 'unordered' });
    const unrelatedChild = collection(501, { DisplayName: 'Másik ág rendje', ParentCollection: unrelated });
    data.collections.push(grandchild, unrelated, unrelatedChild,
      collection(104, { DisplayName: 'Rejtett mélyebb rend', ParentCollection: grandchild, IsListed: false }));
    data.memberships.push(membership(204, data.items[1], grandchild, 7, 'VII/G')); state.context = deepPage; rebuild();
    await render(<EditorialHub />, '/Gyujtemenyek/Kalandozas/melyebb-rend');
    expect(container.querySelector('select').value).toBe('103');
    expect(row(container, 2).querySelector('.rm-editorial-number').textContent).toBe('VII/G');
    expect(container.querySelector('.rm-unplaced').textContent).toContain('Tétel 1');
    expect(container.querySelector('.rm-unplaced').textContent).toContain('Tétel 3');
    const choices = [...container.querySelector('select').options].map(option => option.textContent);
    expect(choices).toContain('Mélyebb rend');
    ['Másik ág', 'Másik ág rendje', 'Rejtett mélyebb rend'].forEach(name => expect(choices).not.toContain(name));
  });

  test('article context shows item publishing roles and requires an explicit order when several direct manual collections exist', async () => {
    const article = data.articles[0];
    await render(<EditorialArticleContext article={article} />);
    expect(container.querySelector('h2').textContent).toBe('A cikkben bemutatott művek');
    expect(container.textContent).toContain('Első kiadás');
    expect(container.textContent).toContain('Tételkiadó');
    expect(container.textContent).toContain('Kiadói műhely');
    expect(container.textContent).not.toContain('Cikkforrás');
    expect(container.querySelector('select').value).toBe('');
    expect(container.querySelector('nav[aria-label="Előző és következő tétel"]')).toBeNull();
    const chips = container.querySelector('nav[aria-label="Kapcsolódó gyűjtemények"]');
    expect([...chips.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/Gyujtemenyek/Kalandozas']);
    expect([...chips.querySelectorAll('span')].map(node => node.textContent)).toContain('Kiadói rend');
    await change(container.querySelector('select'), '101');
    const neighbours = container.querySelector('nav[aria-label="Előző és következő tétel"]');
    expect(neighbours.textContent).toContain('Tétel 2');
    expect(neighbours.textContent).toContain('II/B');
    expect(neighbours.textContent).toContain('Még nincs ismertető');
    expect(neighbours.querySelector('a')).toBeNull();
    expect(neighbours.children).toHaveLength(1);
    expect(neighbours.textContent).not.toContain('Előző tétel');
    expect(neighbours.textContent).not.toMatch(/Közös ismertető|Titkos ismertető|Jövőbeli ismertető/);
  });

  test('known display labels survive unknown positions, while article context invents no ordinal or neighbour', async () => {
    data.memberships.push(membership(204, data.items[2], data.collections[1], null, 'X/A')); rebuild();
    // A separate review of the parent-only item avoids an ambiguous multi-item current position.
    const article = review(50, { DisplayName: 'Külön ismertető' });
    data.articles.push(article); data.annotations.push(annotation(350, article, data.items[2])); rebuild();
    await render(<EditorialArticleContext article={article} />);
    expect(container.textContent).toContain('Kiadói rend: X/A');
    expect(container.textContent).toContain('Ebben a sorrendben még nincs egyértelmű helye');
    expect(container.querySelector('nav[aria-label="Előző és következő tétel"]')).toBeNull();
  });

  test('article collection chips use a child collection own native HubPage when configured', async () => {
    data.collections[1].HubPage = { ...hubPage, Id: 904, Path: `${hubPage.Path}/kiadoi-rend`, DisplayName: 'Kiadói rend' };
    rebuild();
    await render(<EditorialArticleContext article={data.articles[0]} />);
    const childLink = [...container.querySelectorAll('.rm-chip')].find(node => node.textContent === 'Kiadói rend');
    expect(childLink.tagName).toBe('A');
    expect(childLink.getAttribute('href')).toBe('/Gyujtemenyek/Kalandozas/kiadoi-rend');
  });

  test('duplicate positions show a reader-facing warning and disable neighbouring review links', async () => {
    data.memberships.push(membership(204, data.items[2], data.collections[1], 2, 'II/C')); rebuild();
    await render(<EditorialHub />);
    await change(container.querySelector('select'), '101');
    expect(container.querySelector('.rm-editorial-conflict').textContent).toContain('több tétel azonos helyen');
    await render(<EditorialArticleContext article={data.articles[0]} />);
    await change(container.querySelector('select'), '101');
    expect(container.querySelector('.rm-editorial-conflict')).not.toBeNull();
    expect(container.querySelector('nav[aria-label="Előző és következő tétel"]')).toBeNull();
  });

  test('unrelated URL fragments do not select a different collection or expose placeholders as article cards', async () => {
    await render(<EditorialHub />, '/Gyujtemenyek/Kalandozas#unrelated-section');
    expect(container.querySelector('select').value).toBe('publication');
    expect(titleTexts(container)).toEqual(['Zéta ismertető', 'Közös ismertető', 'Alfa ismertető']);
    expect(container.textContent).not.toContain('Tétel 2');
  });

  test('listed standalone items remain visible without fabricating a collection, review or link', async () => {
    state.context = collectionsPage;
    const standalone = item(5, { DisplayName: 'Önálló, még nem ismertetett mű' });
    data.items.push(standalone); rebuild();
    await render(<EditorialCollections />);
    const standaloneRow = row(container, standalone.Id);
    expect(standaloneRow).not.toBeNull();
    expect(standaloneRow.textContent).toContain(standalone.DisplayName);
    expect(standaloneRow.textContent).toContain('Még nincs ismertető');
    expect(standaloneRow.querySelector('a')).toBeNull();
    expect(row(container, 4).textContent).toContain('Csoport nélküli ismertető');
    expect(row(container, 1)).toBeNull();
  });

  test.each([<EditorialCategory />, <EditorialHub />, <EditorialCollections />, <EditorialArticleContext article={review(10)} />])('failed layers show a generic failure without legacy fallback %#', async element => {
    state.editorial = createEditorialLayer({ root: rootPath, editorialRoot: rootPath });
    await render(element);
    expect(container.textContent).toContain('A tartalom most nem tölthető be.');
    expect(container.textContent).not.toMatch(/invalid-editorial-root|Alfa ismertető|Régi kitalált sorozat/);
  });

  test('an invalid category path does not broaden its scope to every story', async () => {
    state.context = { ...books, Path: 'invalid-path' };
    await render(<EditorialCategory />);
    expect(container.textContent).toContain('A tartalom most nem tölthető be.');
    expect(titleTexts(container)).toEqual([]);
  });

  test('the dedicated opt-in components remain absent when the editorial layer is disabled', async () => {
    state.editorial = null;
    await render(<><EditorialCategory /><EditorialHub /><EditorialCollections /><EditorialArticleContext article={data.articles[0]} /></>);
    expect(container.textContent).toBe('');
  });
});
