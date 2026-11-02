import { createRequire } from 'node:module';

// Match CRA's production dotenv files and precedence, including shell/Netlify vars.
// This runs only in CLI/build tools, never in the frontend or on a visitor request.
export function loadEnvironment() {
  process.env.NODE_ENV = 'production';
  createRequire(import.meta.url)('react-scripts/config/env');
}
