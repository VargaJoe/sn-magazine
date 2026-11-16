# SN Magazine engine

Public, content-driven SenseNet blog engine. Layouts, widgets, native paths,
repository stylesheets, SEO, error handling and sanitization are shared. Site
modules, themes, artwork and application configuration live in independent
application repositories.

## Engine development

Use the Node version in `.nvmrc`, then:

```sh
npm ci
npm test -- --watchAll=false --runInBand
npm run test:packaging
```

`.npmrc` retains the legacy peer-dependency mode required by the existing React
18 / Material UI 4 combination. Dependencies are exact and locked. Updating that
toolchain is a separate change. AJV 8 is an explicit build dependency so a fresh application install cannot hoist AJV 6 beneath ajv-keywords 5.

`engine/manifest.json` lists the neutral core and optional reusable features.
The package `files` list includes only their sources, public engine assets and
build/test tooling. Test fixtures, site sources, themes and credentials are not
package inputs. An exported SDK additionally records every source SHA256.

## Application contract

An application installs `@vargajoe/sn-magazine-engine` from an exact Git commit
and commits its own lockfile. It owns `src/sites/<id>/site.json`, its modules and
tests in that namespace, and `.env.example` with public browser configuration.
An ignored `.env` can override public values. Writer credentials belong in a
separate local repository runtime and never enter the frontend configuration.

Run from the application root:

```sh
node node_modules/@vargajoe/sn-magazine-engine/scripts/run-site.mjs --manifest src/sites/my-blog/site.json
node node_modules/@vargajoe/sn-magazine-engine/scripts/test-site.mjs --manifest src/sites/my-blog/site.json
```

The build creates isolated source/output/evidence directories under the caller's
`temp/`. The source SDK is assembled with only selected features and the owning
site. A literal registry preserves native widget keys without filesystem lookup.
Physical inputs, static import closure, every recursive Webpack module/chunk,
compiler-declared related assets and all output hashes are checked. Evidence
remains outside public output. Preview launchers must verify `last-build.json`
with `scripts/verify-site-build.mjs` before serving a build.

The test command uses another isolated assembly, selecting only the owning site's
tests and mock-compatible literal loaders. A site with no bespoke runtime tests
still gets explicit assembly verification; its browser integration is checked
against its own native repository.

Optional initial header artwork is an explicit application build input, accepted
only by a descriptor with `allowInitialHeader: true`. It is not an engine asset.

## Local repository

The generic Compose repository starter remains under `deploy/local/`. Existing
runtime volumes are reused during application migration; installing or building
an app does not start, reset or import a database. See
[local repository documentation](deploy/local/README.md) and
[repository split](docs/engine-and-site-repositories.md).

The original license is preserved in [LICENSE](LICENSE). This Git dependency is
not an npm publication; no registry release or production deployment is implied.
