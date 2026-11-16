import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { MagazineHub } from './sections';
import { visibleHubs } from './model';

const mockRepo = { loadCollection: jest.fn() };
let mockState;
jest.mock('@sensenet/hooks-react', () => ({ useRepository: () => mockRepo }));
jest.mock('./provider', () => ({ ...jest.requireActual('./provider'), useMagazine: () => mockState }));

const rootPath = '/Root/Content/Journal';
const review = (Id, DisplayName) => ({ Id, DisplayName, Path: `${rootPath}/Books/item-${Id}`, Type: 'LeisureBookReview', PublishDate: '2025-01-01T00:00:00Z' });

it('keeps hidden, technical and outside-root hubs out of discovery', () => {
  const hub = { Id: 1, Type: 'SmartFolder', Path: rootPath + '/Collections/series' };
  expect(visibleHubs([hub, { ...hub, Id: 2, Hidden: true }, { ...hub, Id: 3, Path: rootPath + '/(structure)/series' },
    { ...hub, Id: 4, Path: '/Root/Content/Other/series' }], rootPath)).toEqual([hub]);
});

it('merges unreviewed volumes into the selected order without borrowing another numbering scheme', async () => {
  const previousRoot = process.env.REACT_APP_DATA_PATH;
  process.env.REACT_APP_DATA_PATH = rootPath;
  const previousAct = global.IS_REACT_ACT_ENVIRONMENT; global.IS_REACT_ACT_ENVIRONMENT = true;
  const members = [review(1, 'First'), review(3, 'Third')];
  mockRepo.loadCollection.mockResolvedValue({ d: { results: members, __count: '2' } });
  mockState = { root: rootPath, source: { DefaultBrowseView: ['collections'] }, context: { Path: rootPath + '/Collections/Series', DisplayName: 'Series', Query: '+Series:"Series"' }, articles: members,
    annotations: [{ Id: 11, Target: { Id: 1 }, SequenceNumber: 1, PublisherSequence: 30 },
      { Id: 13, Target: { Id: 3 }, SequenceNumber: 3, PublisherSequence: 40 },
      { Id: 12, DisplayName: 'Second', Series: 'Series', SequenceNumber: 2, PublisherSequence: 10 }] };
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    // ReactDOM's render needs act; this fixture does not use Testing Library.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MagazineHub /></MemoryRouter>));
    const numbers = () => [...container.querySelectorAll('.rm-series-number')].map(node => node.textContent);
    expect(numbers()).toEqual(['1', '2', '3']);
    const placeholder = [...container.querySelectorAll('.rm-series-row')].find(node => node.textContent.includes('Second'));
    expect(placeholder.querySelector('a')).toBeNull();
    expect(placeholder.textContent).toContain('Még nincs ismertető');
    const select = container.querySelector('select');
    await act(async () => { select.value = 'publisher'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(numbers()).toEqual(['10', '30', '40']);
    await act(async () => { select.value = 'timeline'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(numbers()).toEqual(['—', '—', '—']);
    expect(container.querySelector('.rm-unplaced')).not.toBeNull();
  } finally {
    await act(async () => root.unmount()); container.remove(); global.IS_REACT_ACT_ENVIRONMENT = previousAct;
    if (previousRoot === undefined) delete process.env.REACT_APP_DATA_PATH; else process.env.REACT_APP_DATA_PATH = previousRoot;
  }
});
