# Architecture

## Goals

Clean architecture with strict separation of concerns: every piece of business
logic (layout, variation, paper, export, print, project schema) lives in a
framework-free TypeScript package with unit tests, and the two apps are thin
adapters — React for presentation, Electron for OS integration. The same
engine code runs in Node (tests/CLI), the browser and Electron.

## Layer diagram

```
┌────────────────────────────────────────────────────────────────┐
│ apps/desktop (Electron main)                                   │
│   window management · dialogs · validated IPC · print/PDF      │
└───────────────▲────────────────────────────────────────────────┘
                │ contextBridge (typed, narrow, validated)
┌───────────────┴────────────────────────────────────────────────┐
│ apps/renderer (React)                                          │
│   components · zustand store · services (platform/import/      │
│   export/metrics) · command registry · hooks                   │
└───────────────▲────────────────────────────────────────────────┘
                │ pure function calls
┌───────────────┴────────────────────────────────────────────────┐
│ packages (domain, no framework dependencies)                   │
│                                                                │
│  handwriting-engine   text ─▶ LayoutResult (glyph instances)   │
│  paper-engine         PaperConfig ─▶ SVG background layer      │
│  export-engine        LayoutPage ─▶ SVG ─▶ PNG/JPG/PDF         │
│  print-engine         SVG pages ─▶ print HTML ─▶ adapter       │
│  shared               types · defaults · project schema        │
│  utils                seeded RNG · hashing · geometry · escape │
└────────────────────────────────────────────────────────────────┘
```

Dependency rule: arrows only point downward. Packages never import from apps;
`shared`/`utils` never import from engines.

## The rendering pipeline

```
text ──layoutDocument()──▶ LayoutResult ──renderPageSvg()──▶ SVG per page
                │                              │
     GlyphMetricsProvider              paper layer + ink filter
     (canvas-measured in app,          (feTurbulence displacement,
      table-based in Node)              spread blur, pressure opacity)
                                               │
                       preview (inline SVG) · PNG/JPG (canvas) ·
                       PDF (printToPDF vector / pdf-lib raster) · print
```

Key design decisions:

1. **Determinism.** All randomness flows through a seeded PRNG
   (`utils/rng.ts`). A glyph's seed is `hash(documentSeed, charIndex, char)`,
   so previews, exports and reopened projects are pixel-identical, while two
   occurrences of the same letter always differ ("never identical twins" is
   enforced by test).
2. **Two-phase layout.** Word wrapping uses base advance widths only; jitter
   is applied when placing glyphs. Changing randomness therefore never
   reflows the document — a property that keeps undo, page counts and
   thumbnails stable (also under test).
3. **Style vs. randomness.** A `HandwritingStyle` carries its own variance
   amplitudes (its personality); the user's `RandomnessProfile` (0..1 per
   channel + master intensity) scales them. Ink presets are orthogonal and
   drive the SVG filter parameters.
4. **Virtualised preview.** Page slots always occupy their exact pixel size,
   but SVG markup mounts only near the viewport (IntersectionObserver), so a
   500-page document costs ~3 rendered pages at any time.
5. **Alternates without extra fonts.** Each character has N procedural
   alternates (per-alternate skew + the continuous jitter channels). The
   layout engine forbids adjacent identical characters from sharing an
   alternate. Custom alternate glyph sets per font are a roadmap item.

## Renderer component hierarchy

```
App
├── Toolbar                 project/edit/export/print/view actions
├── TabBar                  multi-document tabs
├── EditorPanel             title · find/replace · textarea (spellcheck)
├── PreviewPanel
│   ├── ThumbnailRail       clickable page thumbnails (lazy)
│   ├── LazyPage × pages    virtualised SVG pages
│   └── zoom / page nav chip
├── SettingsPanel           style · ink · randomness · paper · page ·
│                           export · application sections
├── StatusBar               words · chars · pages · style · save state
├── CommandPalette          Ctrl+K, filters the command registry
└── Toast                   transient status/errors
```

State: a single zustand store (`state/store.ts`) holds the project, UI
preferences and undo/redo stacks. Every user action is a `Command`
(`commands.ts`) shared by toolbar, palette and shortcuts — one definition per
behaviour.

## Data model ("database schema")

Projects are plain JSON files (`.hsproj`) — no executable content, versioned,
validated on load (`shared/project.ts`). This _is_ the persistence schema:

```
ProjectFile
├── version: 1                    breaking-change gate
├── app: "handscript-studio"     file-type marker
├── createdAt / updatedAt         ISO timestamps
├── activeDocumentId
└── documents[]: ProjectDocument
    ├── id, title, text
    └── config: RenderConfig
        ├── styleId · inkId · seed · sizeFactor
        ├── randomness: RandomnessProfile (8 channels, 0..1)
        ├── paper: PaperConfig (template, colours, ruling, holes)
        └── page: PageSetup (size, orientation, margins, line height,
                             paragraph spacing, header/footer, numbering)
```

`parseProjectFile` never trusts input: unknown keys are dropped, every scalar
is clamped to a safe range, colours must match `#hex`, enum fields fall back
to defaults. Hostile files degrade to a valid project (tested in
`tests/integration`).

Autosave uses the same schema in `localStorage` (crash recovery); the recent
projects list stores paths only.

## IPC / API design (Electron)

The renderer is sandboxed (contextIsolation, no nodeIntegration). The whole OS
surface is five invoke-channels exposed via `contextBridge` and typed by
`apps/renderer/src/types/bridge.d.ts`:

| Channel        | Request → Response                        | Validation in main                                                     |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `project:open` | () → `{path, json} \| null`               | OS dialog picks path; 100 MB cap                                       |
| `project:save` | (path?, json) → `{path} \| null`          | string+size check; dialog when no path                                 |
| `file:save`    | (name, bytes, filters) → `{path} \| null` | binary check, 500 MB cap, filename sanitised, extensions whitelisted   |
| `print:html`   | (html, {landscape}) → void                | size cap; hidden window; OS print dialog handles printer/duplex/copies |
| `pdf:fromHtml` | (html, wMm, hMm) → `Uint8Array`           | size cap, finite page size; Chromium printToPDF (vector)               |

File paths never originate in the renderer — they come from OS dialogs — which
structurally rules out path traversal. Navigation and `window.open` are denied;
CSP allows only `'self'` resources.

## Performance notes

- Layout is O(characters); ~200 pages lay out in <1 s (perf test in CI).
- SVG generation is per-page and only for visible pages.
- `pdf-lib` is code-split behind a dynamic import; startup bundle ≈ 200 kB.
- Canvas glyph metrics are memoised per (font stack, character).
- GPU: SVG filters and compositing run on Chromium's GPU raster path.

## Roadmap / extension points

- DOCX/PDF import (`services/importers.ts` returns a typed "not yet" today).
- Raster paper/ink textures and decorative assets (`assets/README.md`).
- Font manager UI for user-installed handwriting fonts (manifest exists;
  installing/removing/categorising is CLI-level today — drop files + CSS).
- Optional AI features (style transfer, page balancing, smart line breaking)
  belong behind a new `packages/ai-engine` port so the core stays offline.
  Personal-handwriting cloning is deliberately out of scope (see README note
  and docs/security.md).
