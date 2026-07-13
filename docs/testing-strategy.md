# Testing strategy

## Principles

The value of this product is in deterministic rendering logic, so tests
concentrate where the risk is: the engines. UI components stay thin (they map
store state to DOM and delegate behaviour to the command registry), so a small
number of integration points cover them.

## Test pyramid

| Layer             | Where                                | What is asserted                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (fast, pure) | `packages/*/src/*.test.ts`           | RNG determinism; glyph variation invariants (same seed ⇒ identical, adjacent twins ⇒ different alternates, zero randomness ⇒ zero jitter, pressure ∈ [0,1]); word wrap stays inside margins; pagination; rule snapping; reflow-stability under randomness changes; paper templates render for every id; SVG structure, escaping and determinism; print HTML structure and title escaping |
| Integration       | `tests/integration/pipeline.test.ts` | full text→layout→SVG→PDF pipeline; PDF loads back with correct page count/size; project JSON round-trip; hostile project files are sanitised, not trusted; ~200-page performance envelope                                                                                                                                                                                                |
| Static            | CI                                   | `tsc --strict` on every workspace, ESLint (typescript-eslint), Prettier check                                                                                                                                                                                                                                                                                                            |

Run everything:

```bash
npm test               # vitest run (all workspaces + tests/)
npm run test:watch     # watch mode
npx vitest run --coverage
```

## What is intentionally not unit-tested (and why)

- **Pixel output of SVG filters** — visual quality is reviewed by loading
  exported SVGs/PNGs; DOM-free environments cannot rasterise filters
  faithfully. The SVG _structure_ (filters present, parameters derived from
  the ink preset) is asserted instead.
- **Electron main process** — the IPC surface is 5 handlers of straight-line
  validation code. It is covered by the security checklist review
  (docs/security.md) and exercised manually; introducing an Electron test
  harness (Playwright + electron) is the designated next step if this
  surface grows.
- **React components** — behaviour lives in `commands.ts`/store, both plain
  TS. Component smoke tests via @testing-library are welcome additions but
  redundant while components stay declarative.

## Regression rules

1. Every bug fix lands with a failing-first test at the lowest layer that can
   express it.
2. Rendering changes that alter output for the same seed are breaking: bump
   `PROJECT_FILE_VERSION` discussion + changelog entry, because saved
   projects will re-render differently.
3. Performance envelope test guards O(n) layout; if it slows 10×, CI fails.
