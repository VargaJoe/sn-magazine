# SN Magazine — R5 Fotel homepage (ECM-driven)

- Design refs: `art/*`, `DESIGN_ROUND5.md` (not production assets)
- Live layout: `src/components/layouts/page-fotel-r5.js`
- Temporary slot chrome: `src/components/layouts/fotel-r5-slots.css` (bootstrap only)
- **Production skin CSS path (ECM):** `{REACT_APP_API_URL}{REACT_APP_DATA_PATH}/(structure)/Site/skin.css`
  - Same Site folder as `logo.png`. Upload Fotel (or Manga) skin tokens there — one engine, many sites.
  - Optional override: `REACT_APP_SKIN_CSS_PATH`
- **Removed from production path:** `public/Fotel-R5.css`, `public/fotel-r5/*` stock covers, baked Iris wordmark, hardcoded Filmek/Könyvek routes, picsum/stock bake

**Publish filter:** queries use `+PublishDate:<@@CurrentTime@@` (same as ECM SmartFolders `LEGFRISSEBB UTAZÁSOK` / `HÍREK` under `(structure)/Queries`).

**Nav / logo:** ECM categories (`DisplayZone` menuitem/menuicon) + `REACT_APP_LOGO_PATH` API logo.

Manga: `.env.mangajanlo*` untouched.
