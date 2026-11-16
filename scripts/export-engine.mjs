import path from 'node:path';
import {exportEnginePackage, validateBuildOutput} from './lib/site-packages.mjs';

try {
  if (process.argv.length !== 4 || process.argv[2] !== '--output' || !path.isAbsolute(process.argv[3])) {
    throw Error('Usage: node scripts/export-engine.mjs --output ABSOLUTE_FRESH_TEMP_DIRECTORY');
  }
  const repoRoot = process.cwd();
  const outputRoot = await validateBuildOutput(repoRoot, process.argv[3]);
  if (outputRoot === path.resolve(repoRoot, 'build')) throw Error('Keep engine packages under workspace/temp');
  const {root, manifest} = await exportEnginePackage({repoRoot, outputRoot});
  console.log(JSON.stringify({root, version:manifest.version, fingerprint:manifest.fingerprint}));
} catch (error) { console.error(error.message); process.exitCode = 1; }
