// Tests use Jest's built-in matchers and React's act() helpers.
import { registerComponentLoaders } from './components/utils/component-registry';
import componentLoaders from './test-support/component-loaders';

registerComponentLoaders(componentLoaders);
global.IS_REACT_ACT_ENVIRONMENT = true;
