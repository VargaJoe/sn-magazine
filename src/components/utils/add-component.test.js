import { importView, addComponent, clearLazyComponentCache } from './add-component';

describe('Dynamic Component Resolution', () => {
  beforeEach(() => {
    clearLazyComponentCache();
  });

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
});
