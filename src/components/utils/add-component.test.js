import { importView, addComponent, clearLazyComponentCache } from './add-component';

describe('Dynamic Component Resolution', () => {
  beforeEach(() => {
    clearLazyComponentCache();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns null rather than an invalid React element when the folder is missing', () => {
    const Fallback = importView(undefined, 'auto', 'default');
    expect(Fallback).toBeNull();
    expect(addComponent(undefined, 'auto', 'default', 1)).toBeNull();
  });

  it('should cache components and not duplicate them', () => {
    const Comp1 = importView('widgets', 'auto', 'default');
    const Comp2 = importView('widgets', 'auto', 'default');
    expect(Comp1).toBe(Comp2);
  });

  it('resolves updated module exports after clearing the lookup cache', () => {
    const widgetModule = require('../widgets/auto-default');
    const original = widgetModule.default;
    const Comp1 = importView('widgets', 'auto', 'default');
    const RefreshedWidget = () => null;
    try {
      widgetModule.default = RefreshedWidget;
      expect(importView('widgets', 'auto', 'default')).toBe(Comp1);
      clearLazyComponentCache();
      expect(importView('widgets', 'auto', 'default')).toBe(RefreshedWidget);
    } finally {
      widgetModule.default = original;
      clearLazyComponentCache();
    }
  });

  it('should support custom fallback', () => {
    const Comp = importView('widgets', 'auto', 'not-exist', 'default');
    expect(Comp).toBeDefined();
  });

  it('retains layout, widget and content resolution through the supported folders', () => {
    expect(importView('layouts', 'page', 'wide')).toBe(require('../layouts/page-wide').default);
    expect(importView('widgets', 'manual', 'magazine-books')).toBe(require('../widgets/manual-magazine-books').default);
    expect(importView('content', 'auto', 'default')).toBe(require('../content/auto-default').default);
  });

  it('keeps custom-prefix and automatic fallback behaviour', () => {
    expect(importView('widgets', 'manual', 'not-present', 'list-news')).toBe(require('../widgets/manual-list-news').default);
    expect(importView('widgets', 'manual', 'not-present')).toBe(require('../widgets/auto-default').default);
  });

  it('never dispatches to tests or a folder outside the component registry', () => {
    expect(importView('widgets', 'manual', 'anything.test')).toBe(require('../widgets/auto-default').default);
    expect(importView('widgets', 'manual', 'anything.spec')).toBe(require('../widgets/auto-default').default);
    expect(importView('magazine', 'editorial', 'sections.test')).toBeNull();
    expect(importView('widgets/../magazine', 'editorial', 'sections')).toBeNull();
  });
});
