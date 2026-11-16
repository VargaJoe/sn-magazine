import { getComponent, getRegistryRevision, registerComponentLoaders } from './component-registry';

it('resolves only registered keys and never interprets a repository value as a module path', () => {
  const Component = () => null;
  registerComponentLoaders({ 'widgets/manual-example': () => Component });
  expect(getComponent('widgets/manual-example')).toBe(Component);
  expect(() => getComponent('widgets/manual-other-site')).toThrow('Unknown component');
  expect(() => getComponent('widgets/../../sites/private')).toThrow('Unknown component');
  expect(() => getComponent('widgets/__proto__')).toThrow('Unknown component');
});

it('invalidates component lookup caches when the consumer registry is replaced', () => {
  const first = () => null, second = () => null;
  registerComponentLoaders({ 'widgets/auto-default': () => first });
  const before = getRegistryRevision();
  registerComponentLoaders({ 'widgets/auto-default': () => second });
  expect(getRegistryRevision()).toBeGreaterThan(before);
  expect(getComponent('widgets/auto-default')).toBe(second);
  expect(() => registerComponentLoaders({ '../site': () => first })).toThrow('Invalid component registration');
});
