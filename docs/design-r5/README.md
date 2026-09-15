# Design R5 assets

- `DESIGN_ROUND5.md` — IA / tokens lock
- `fotel-home-r5.html` — structural reference
- `art/*` — STOCK placeholder covers (layout demo; replace with ECM/Binary or licensed stills)
- Live skin: `src/components/layouts/page-fotel-r5.js` + `public/Fotel-R5.css`

**ECM vs client CSS:** Visual chrome (header, hero fold, floating card, icon nav, trips grid, archive CTA) ships as client layout+CSS. SenseNet still owns content: set homepage Layout `PageTemplate` to `fotel-r5` (Fotel home also auto-resolves from `leisure-simple` when `REACT_APP_DATA_PATH` contains `fotelvandor`). Wire widgets / CustomRoot for live reviews when ready. Manga env files untouched.
