import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { useRepository } from '@sensenet/hooks-react';
import TranslationContent from './content/auto-leisuremangatranslation';
import ThirdSizedTranslationList from './widgets/manual-list-translation-third';
import TranslationListWidget from './widgets/manual-list-translations';
import BindedContext from './utils/context-binding';
import { useSnStore } from './store/sn-store';

jest.mock('@sensenet/hooks-react', () => ({ useRepository: jest.fn() }));
jest.mock('./utils/context-binding', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./utils/show-debuginfo', () => ({ __esModule: true, default: () => null }));
jest.mock('./utils/add-component', () => ({ addComponent: jest.fn(() => null) }));
jest.mock('./utils/lazyload-image', () => ({ __esModule: true, default: () => null }));
jest.mock('react-lazyload', () => ({ __esModule: true, default: ({ children }) => children }));

const translations = [
  { Id: 101, DisplayName: 'Example translation A', PublishDate: '2026-01-01T00:00:00Z' },
  { Id: 202, DisplayName: 'Example translation B', PublishDate: '2026-01-02T00:00:00Z' },
];

describe.each([
  ['translation content', TranslationContent, "Translation:('101')"],
  ['third-width translation list', ThirdSizedTranslationList, 'Translation:(101 202)'],
  ['translation list widget', TranslationListWidget, 'Translation:(101 202)'],
])('%s configured repository queries', (_, Component, expectedQuery) => {
  let root;
  let container;
  let repository;
  const originalDataPath = process.env.REACT_APP_DATA_PATH;
  const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;

  async function render() {
    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Component widget={{ Id: 900 }} />
        </MemoryRouter>,
      );
    });
  }

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    delete process.env.REACT_APP_DATA_PATH;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    repository = { loadCollection: jest.fn().mockResolvedValue({ d: { results: [] } }) };
    useRepository.mockReturnValue(repository);
    BindedContext.mockReturnValue({
      content: { Id: 300, DisplayName: 'Example collection' },
      children: translations,
    });
    useSnStore.setState({
      context: { Id: 101, DisplayName: 'Example translation A', Description: 'Example description' },
      page: null,
      widgets: null,
      layout: 'wide',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
    if (originalDataPath === undefined) delete process.env.REACT_APP_DATA_PATH;
    else process.env.REACT_APP_DATA_PATH = originalDataPath;
  });

  it.each(['/Root/Content/example-a', '/Root/Content/example-b'])(
    'uses configured root %s and preserves translation filtering and expansion', async configuredRoot => {
      process.env.REACT_APP_DATA_PATH = configuredRoot;
      await render();

      expect(repository.loadCollection).toHaveBeenCalledTimes(1);
      expect(repository.loadCollection).toHaveBeenCalledWith({
        path: configuredRoot,
        oDataOptions: { query: expectedQuery, select: 'all', expand: 'Translation' },
      });
      expect(container.textContent).toContain('Example');
    },
  );

  it('does not query the repository when the data root is missing', async () => {
    await render();
    expect(repository.loadCollection).not.toHaveBeenCalled();
  });

  it('does not query the repository when the data root is empty', async () => {
    process.env.REACT_APP_DATA_PATH = '';
    await render();
    expect(repository.loadCollection).not.toHaveBeenCalled();
  });
});
