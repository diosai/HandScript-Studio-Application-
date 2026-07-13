# HandScript Studio

Convert digital text into realistic handwritten pages — type, paste or import
text, watch it become handwriting on paper in a live preview, then export to
PDF/PNG/JPG/SVG or print.

Built as a desktop-first application: **Electron + React + TypeScript**, with
the entire rendering pipeline implemented as pure, tested TypeScript packages
that also run in a plain browser.

> HandScript Studio is for creative, educational and document-formatting use.
> It deliberately does not imitate any real person's handwriting or signatures.

## Highlights

- **Handwriting engine** — six style families (print, cursive, school, elegant,
  calligraphy, technical), each with per-glyph alternates, seeded jitter of
  position/angle/size/baseline/spacing, pen-pressure simulation and coherent
  "hand drift". Repeated letters are never identical, and the same seed always
  reproduces the same page.
- **Ink simulation** — 7 pen presets (ballpoints, pencil, fountain, gel) with
  ink spread, edge roughness, pressure-driven opacity and dry-stroke dips,
  implemented as SVG filter pipelines.
- **Paper engine** — 10 procedural paper templates (ruled, college, grid, dot
  grid, engineering, graph, music staff, notebook, legal, blank) plus custom
  ruling; writing snaps to the rules on lined paper.
- **Studio UI** — multi-document tabs, dockable settings panel, command palette
  (Ctrl+K), keyboard shortcuts, light/dark themes, high-contrast mode, UI
  scaling, live paginated preview with zoom (25–200 %), thumbnails,
  single/two-page/continuous views.
- **Projects** — `.hsproj` JSON projects with validation, autosave, crash
  recovery, recent files, undo/redo history.
- **Export & print** — PDF (vector via Electron, raster in browser), PNG/JPG at
  up to 600 DPI, SVG, transparent backgrounds, OS print dialog with duplex.
- **Performance** — layout is O(characters); pages are virtualised, so
  500+-page documents preview smoothly (see `tests/integration`).

## Repository layout

```
HandScript-Studio-Application-/
├── apps/
│   ├── desktop/              Electron main + preload (secure IPC shell)
│   └── renderer/             React UI (also runs standalone in a browser)
├── packages/
│   ├── handwriting-engine/   styles, inks, metrics, variation, layout
│   ├── paper-engine/         procedural paper templates (SVG)
│   ├── export-engine/        SVG composer, PNG rasteriser, PDF assembly
│   ├── print-engine/         print document builder + adapters
│   ├── shared/               domain types, defaults, project schema
│   └── utils/                seeded RNG, hashing, geometry, XML escaping
├── assets/                   font pack manifest & licences
├── docs/                     architecture, guides, testing, deployment
└── tests/                    cross-package integration tests
```

## Quick start

```bash
git clone https://github.com/diosai/HandScript-Studio-Application-.git
cd HandScript-Studio-Application-
npm install                 # add ELECTRON_SKIP_BINARY_DOWNLOAD=1 to skip the desktop runtime

npm test                    # unit + integration tests (vitest)
npm run lint                # eslint
npm run typecheck           # strict tsc across all workspaces

npm run dev                 # browser dev server (Vite) at http://localhost:5173
npm run dev:desktop         # Electron shell pointed at the dev server
npm run build               # production build of every workspace
```

See `docs/installation.md` for packaging installers, and `docs/user-guide.md`
for how to use the app.

## Documentation

| Document                   | Contents                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| `docs/architecture.md`     | Clean-architecture overview, component hierarchy, project file schema, IPC API |
| `docs/wireframes.md`       | UI wireframes and interaction notes                                            |
| `docs/user-guide.md`       | End-user manual, shortcuts, workflows                                          |
| `docs/installation.md`     | Dev setup and installer packaging                                              |
| `docs/testing-strategy.md` | Test pyramid, what is covered where                                            |
| `docs/security.md`         | Threat model and mitigations                                                   |
| `docs/deployment.md`       | Build pipeline, CI/CD, release process                                         |

## Licence

MIT for the application code. Bundled fonts are OFL 1.1 / Apache 2.0 — see
`assets/fonts/README.md`.
