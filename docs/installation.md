# Installation guide

## Requirements

- Node.js ≥ 20 and npm ≥ 10
- Windows 10+, macOS 12+, or a mainstream Linux distribution
- No network access is needed at runtime — the app is offline-first

## Development setup

```bash
git clone https://github.com/diosai/HandScript-Studio-Application-.git
cd HandScript-Studio-Application-
npm install
```

`npm install` downloads the Electron runtime (~100 MB). For CI or
browser-only work, skip it:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
```

### Run in the browser (fastest loop)

```bash
npm run dev            # Vite dev server → http://localhost:5173
```

All features work; PDF export rasterises instead of using the vector path,
and file dialogs become downloads/uploads.

### Run the desktop app

```bash
npm run build --workspace @handscript/renderer   # once, or keep `npm run dev` running
npm run dev:desktop                              # compiles main process + launches Electron
```

With the Vite dev server running, the desktop shell loads it (hot reload);
otherwise it loads the built renderer from `apps/renderer/dist`.

## Verifying an installation

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

All four must pass — CI runs exactly these.

## Packaging installers

Installer packaging uses [electron-builder](https://www.electron.build)
(add it when cutting releases; it is intentionally not a dev dependency of
day-to-day work):

```bash
npm install --save-dev electron-builder --workspace @handscript/desktop
npx electron-builder --project apps/desktop \
  --win nsis --mac dmg --linux AppImage
```

Point its `files` config at `apps/desktop/dist` + `apps/renderer/dist`.
Sign binaries per platform policy (see docs/deployment.md).

## Troubleshooting

- **Handwriting looks like a plain italic font** — the font pack failed to
  load. Check `apps/renderer/public/fonts/` contains the `.ttf` files listed
  in `assets/fonts/README.md`; the app falls back to the system `cursive`
  family by design.
- **`npm install` fails on the `electron` package** — set
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` (browser mode) or configure
  `ELECTRON_MIRROR` behind restrictive proxies.
- **Blank window in packaged app** — ensure the renderer was built with the
  relative `base: './'` (already configured) and that
  `apps/renderer/dist/index.html` ships next to the desktop bundle.
