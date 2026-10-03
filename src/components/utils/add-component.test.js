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

  it('can resolve the same module after clearing its own cache', () => {
    const Comp1 = importView('widgets', 'auto', 'default');
    clearLazyComponentCache();
    const Comp2 = importView('widgets', 'auto', 'default');
    // Clearing our lookup cache does not invalidate Webpack's module cache.
    expect(Comp2).toBe(Comp1);
  });

  it('should support custom fallback', () => {
    const Comp = importView('widgets', 'auto', 'not-exist', 'default');
    expect(Comp).toBeDefined();
  });
});
