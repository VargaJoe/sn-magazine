# Independent engine and applications

The public repository contains only the reusable engine, optional generic
features, schema, neutral tests and build tooling. Applications are independent
private Git repositories, not forks or source copies of the engine.

Each application pins an immutable engine Git commit in package.json and its own
package-lock.json. A normal clean npm ci installs the engine and one dependency
tree; no symlink, sibling checkout or shared node_modules is required. The engine
package's positive file list and the assembled SDK manifest keep application
source out of the engine, and only the selected application's source is copied
into each build.

Engine changes are reviewed in this repository. Application upgrades are explicit
version/commit changes in the application's own review. No release or deployment
is triggered by this migration. Existing repository history is preserved; the
private application development chain is not pushed into public engine history.

An app owns its source descriptor, native presentation configuration, theme,
artwork, local preview Compose configuration, own tests and browser acceptance.
Content and credentials remain in the native repository/runtime. Shared native
service containers and named volumes are preserved while only the two frontend
preview mounts change to builds from their new application directories.

The generic test command assembles the selected engine and app modules in an
ignored directory, then copies only that app's tests into the same namespace.
No application test source or test registry enters a production build.

For an engine checkout use npm ci, npm test -- --watchAll=false --runInBand and
npm run test:packaging. For an application use its own npm ci, npm test,
npm run build and npm run preview commands. Read its README for the native root,
preview port and optional application-specific inputs.
