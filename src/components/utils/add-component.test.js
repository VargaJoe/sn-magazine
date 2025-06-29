import { importView, addComponent, clearLazyComponentCache } from './add-component';
import React from 'react';

describe('Dynamic Component Resolution', () => {
  beforeEach(() => {
    clearLazyComponentCache();
  });

  it('should return a fallback component if type/prefix/component is missing', () => {
    const Fallback = importView(undefined, 'auto', 'default');
    expect(Fallback).toBeDefined();
  });

  it('should cache components and not duplicate them', () => {
    const Comp1 = importView('widgets', 'auto', 'default');
    const Comp2 = importView('widgets', 'auto', 'default');
    expect(Comp1).toBe(Comp2);
  });

  it('should clear cache with clearLazyComponentCache', () => {
    const Comp1 = importView('widgets', 'auto', 'default');
    clearLazyComponentCache();
    const Comp2 = importView('widgets', 'auto', 'default');
    expect(Comp1).not.toBe(Comp2);
  });

  it('should support custom fallback', () => {
    const Comp = importView('widgets', 'auto', 'not-exist', 'default');
    expect(Comp).toBeDefined();
  });
});
