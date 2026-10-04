# Local SenseNet repository

This starts an isolated SQL-backed SenseNet repository and the existing OIDC
identity service. The first start installs the platform into a new named SQL
volume, then imports the public Layout/Widget CTDs from deploy/package. No live
site data is included. The root/deploy Docker Compose examples start React only.
This starter is a single local instance with the Compose project name
sn-magazine-local. Keep its runtime credentials with the original checkout;
another checkout must not generate new credentials for those same volumes.

Requirements: Docker Desktop with Linux containers and Compose v2+, a .NET SDK
with the .NET 8 runtime for SnIO 1.3.0, and Node/npm for the React app. API and identity images
are pinned by digest; SQL uses a fixed CU tag. Configuration follows the official
[SenseNet Docker installer](https://github.com/SenseNet/sensenet/tree/develop/deployment).

## Start and test the public sample

Run these from the repository root in PowerShell:

    ./deploy/local/start.ps1 -WithSample
    ./deploy/local/start-app.ps1

The API is http://localhost:51016, identity is http://localhost:51017, and the
sample app is http://localhost:3006. Both published backend ports bind only to
127.0.0.1; SQL is available only on the Compose network. The app starter sets
process environment overrides and preserves existing .env files.

The optional sample lives under /Root/Content/demo. It has native Page/Widget
contents and ordinary CSS/SVG/font Files; it contains no live-site content or
design. Without -WithSample, only the app CTDs are imported. Default platform
system contents are installed by SenseNet itself.

Verify with the sample's sidebar React Router links:

1. Sample a → Sample b → Sample a: same leisure-simple template, different
   Page-owned CSS links; no previous Page CSS remains.
2. Page B references b.css then b-override.css. The body CSS custom property
   --sn-page-sample is page-b, proving cascade order.
3. Sample legacy: no Page-owned links; the existing static styles still apply.
4. Sample wide: the existing wide React PageTemplate is selected with native CSS.
5. Page A's CSS references marker.svg and fonts/open-sans.ttf relatively. They
   resolve on the repository origin. The sample font is Open Sans from
   [google/fonts](https://github.com/google/fonts/tree/main/ofl/opensans), licensed
   under SIL OFL; its license is included beside the font.

The field and rendering contract is documented in
[Page stylesheets](../../docs/site-presentation.md).

## Local credentials and lifecycle

Generated SQL credentials/API keys and import configuration stay under the ignored
runtime/ directory. SnIO uses temporary configuration files, never a printed
credential command. Logs and staging copies are also ignored. The local API key
is inserted only into this Compose database; the repository is restarted to
reload its API-key cache before imports.

Re-run start.ps1 to reuse the named volumes and import the public schema again.
Use -SkipImport to start existing data without reimporting the baseline. Alternate
RepositoryPort/AuthPort values can be chosen only at first initialization; runtime
configuration records them. The app starter reads the recorded ports.

Stop containers without deleting repository data:

    docker compose --env-file deploy/local/runtime/docker.env -f deploy/local/compose.yml stop

Start again with start.ps1 -SkipImport. No script resets databases or removes
volumes. Inspect Compose logs locally if startup times out. Keep logs/configuration
out of issues and PRs because private import details may appear in them.

The generated writer URL uses 127.0.0.1. On the tested Windows host, .NET requests
to localhost incurred about two seconds of IPv6-first connection delay each;
explicit IPv4 removed that delay. start.ps1 also upgrades its older generated
HTTP localhost writer configuration while preserving the key and port.

## Optional private export import

Place private exports under the ignored temp/ directory. Pass the exported Root
directory; copied export settings are not used:

    ./deploy/local/import-private.ps1 -ExportRoot './temp/<export>/Root'
    ./deploy/local/start-app.ps1 -DataPath '/Root/Content/<site>' -Port 3007

The private importer copies only Content/ and missing CTDs required by those
contents (including missing CTD ancestors) to ignored local staging. It preserves
installed platform/app CTDs, IMS/users, server settings and original export files.
The public app baseline must be installed first. References/permissions are
resolved by SnIO; missing prerequisites cause a failed import and an ignored log
path, not a success claim.

The supplied older site export uses LongText for widget ComponentContent and
ComponentDescription; the public app CTDs use RichText. SenseNet forbids changing
an existing field's type. Keeping the installed app schema lets the HTML string
values import without attempting that incompatible type change. This is a local
fixture adaptation, not an in-place schema migration for a live repository.

For embedded article images, an exported Image.Url can contain the old node ID.
When an ImageData attachment is present, staging omits that computed Image value
and imports the original attached binary, allowing SenseNet to regenerate the URL.
The attachment must exist inside the staged Content tree. Original files and
ImageRef fields are preserved; this also makes repeated fixture imports work.

For a different export with additional app fields or external referenced contents,
review its CTDs/dependencies before relying on an exact replica. This importer
supports site rendering fixtures; it is not a full server/security restore.

Both import scripts reject non-loopback targets. SourceFolder must be a directory,
not a .Content sidecar. Reusable starter/scripts/schema/sample can be published;
temp/, runtime/, deploy/logs/, deploy/tools/ and local environment files must not
be committed or included in Docker build contexts.
