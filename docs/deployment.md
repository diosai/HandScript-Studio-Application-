# Deployment & build pipeline

## Build pipeline

```
npm ci (ELECTRON_SKIP_BINARY_DOWNLOAD=1 in CI)
  ├─ npm run lint            eslint (typescript-eslint + prettier config)
  ├─ npm run format:check    prettier
  ├─ npm run typecheck       tsc --strict per workspace
  ├─ npm test                vitest: unit + integration
  └─ npm run build
       ├─ @handscript/renderer  vite build → apps/renderer/dist (hashed assets, sourcemaps)
       └─ @handscript/desktop   tsc → apps/desktop/dist (main.js, preload.js)
```

Engines (`packages/*`) ship as source and are compiled into the renderer
bundle by Vite; they need no separate build step.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`. It runs the full
pipeline above on every push to main and every pull request, on Ubuntu
with Node 20 and 22. Keep it green — the matrix is the compatibility
contract.

## Release process (desktop installers)

1. Bump versions (`npm version --workspaces`) and update the changelog.
2. Build everything (`npm run build`), run the full verification suite.
3. Package with electron-builder per platform:
   - **Windows:** NSIS installer; sign with an EV/OV code-signing cert
     (`CSC_LINK`/`CSC_KEY_PASSWORD`).
   - **macOS:** dmg + zip; sign with Developer ID and notarise
     (`APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`).
   - **Linux:** AppImage + deb.
4. Attach artifacts to a GitHub Release; tag `v<version>`.
5. Auto-update (roadmap): `apps/updater/` is reserved for an
   electron-updater integration fed by the GitHub Releases feed; until then
   updates are manual installs.

Release builds must happen in CI from a clean checkout — never from a
developer working tree. Secrets (signing certs, Apple credentials) live in
repository secrets, exposed only to the release workflow on tags.

## Browser deployment (secondary target)

`apps/renderer` is a static site (`dist/` after `vite build`). It can be
hosted on any static host for demo/preview purposes; Electron-only features
(vector PDF, native dialogs, silent print) degrade gracefully as documented
in the user guide.

## Versioning & compatibility

- Semantic versioning at the product level.
- `PROJECT_FILE_VERSION` gates the on-disk schema; loaders accept ≤ current
  version and must provide migrations when it bumps.
- Rendering changes for an unchanged seed are user-visible: call them out in
  release notes (saved documents re-render differently).
