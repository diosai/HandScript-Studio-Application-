# Security

## Threat model

Inputs that cross a trust boundary:

1. **Project files** (`.hsproj`) — may come from anywhere.
2. **Imported documents** (txt/md/html) — may contain hostile markup.
3. **Fonts/assets** — static files bundled or user-installed.
4. **The renderer process itself** — treated as compromised when designing
   the main-process IPC surface.

## Mitigations

### Untrusted files never execute

- Project files are plain JSON. `parseProjectFile` validates shape, clamps
  every number, whitelists every enum, regex-checks colours, drops unknown
  keys and truncates strings. Hostile input degrades to defaults (tested).
- HTML import parses with `DOMParser` (inert document — scripts never run,
  resources never load) and reads `textContent` only.
- User text is XML-escaped before entering generated SVG; the preview mounts
  only SVG produced by our own composer. Print HTML escapes titles and embeds
  only those SVGs.
- Fonts are static `.ttf`/`.woff2` loaded by the browser engine under CSP
  `font-src 'self' data:`; no font-embedded code paths exist.

### Electron hardening

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
  `webviewTag: false` on every window.
- The preload bridge exposes exactly five promise-returning functions; no
  generic `ipcRenderer` access leaks to the page.
- Main-process handlers re-validate every payload (type, size caps: 100 MB
  projects, 500 MB exports; filename sanitisation; extension whitelist) —
  the renderer is not trusted even though we wrote it.
- **Path traversal:** file paths are only ever produced by OS open/save
  dialogs in the main process. Renderer-supplied strings are used solely as
  a _suggested_ basename after `path.basename` + character whitelisting.
- Navigation is denied except the app's own origin; `window.open` is denied
  (https links go to the external browser). CSP (`default-src 'self'`) is
  set both in `index.html` and injected via `onHeadersReceived`.

### Injection review points

- SVG/HTML generation: all interpolation sites use `escapeXml`/`escapeHtml`
  or validated numeric/enum/colour values (unit-tested, including
  `<script>` and `javascript:` probes).
- No `eval`, no `Function`, no dynamic `require`, no shell execution
  anywhere in the codebase.

## Dependency policy

Runtime dependencies are minimal by design: `react`, `react-dom`, `zustand`,
`pdf-lib`. Run `npm audit` in CI (non-blocking report) and update quarterly.
Dev-tooling advisories that do not ship in the app are triaged, not
hot-fixed.

## Abuse considerations

The product intentionally ships only generic, synthetic handwriting styles:

- No feature learns or reproduces a specific person's handwriting, and no
  signature capture/rendering exists.
- Exported PDFs are tagged with `Producer: HandScript Studio` metadata.
- The user guide states the acceptable-use policy; forgery and impersonation
  use cases are out of scope and will not be accepted as contributions.
