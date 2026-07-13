# UI wireframes

## Main window

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HandScript Studio │ New Open Save Import │ Undo Redo Re-roll │ Export PDF    │
│                   │                      │                   │ PNG JPG SVG   │
│                   │                      │                   │ Print         │
│                                        Scroll · 1 page · 2 pages │ Thumbs    │
│                                        Settings · Dark · [Ctrl K]            │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▸ Essay draft ×  │ Letter to Ana ×  │ + New                                  │
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│ EDITOR       │  ┌──────┐  ┌────────────────────────────┐    │ SETTINGS       │
│              │  │thumb1│  │ ┌────────────────────────┐ │    │                │
│ [Title.....] │  │thumb2│  │ │  paper + handwriting   │ │    │ Handwriting    │
│              │  │thumb3│  │ │  (live SVG preview)    │ │    │ [Print][Cursive│
│ ┌──────────┐ │  │  ⋮   │  │ │                        │ │    │ [School][Eleg.]│
│ │ textarea │ │  └──────┘  │ └────────────────────────┘ │    │ Size ────●──   │
│ │  (spell- │ │            │        Page 1 of 12        │    │ Seed [1337]    │
│ │  check,  │ │            │ ┌────────────────────────┐ │    │                │
│ │  wrap)   │ │            │ │        page 2          │ │    │ Pen & ink      │
│ │          │ │            │ …continuous scroll…      │ │    │ ●Blue ●Black … │
│ └──────────┘ │            └────────────────────────────┘    │ Randomness     │
│              │                                              │ 8 sliders      │
│ Find/Replace │                              ┌─────────────┐ │ Paper / Page   │
│ (Ctrl+F bar) │                              │ ‹ › − 75% + │ │ Export / App   │
├──────────────┴──────────────────────────────┴──────────────┴─┴───────────────┤
│ 342 words · 1,986 characters · 12 pages      Print · Blue ballpoint · Seed…  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Command palette (Ctrl+K)

```
┌──────────────────────────────────────────────┐
│ > exp…                                       │
├──────────────────────────────────────────────┤
│ Export: PDF (all pages)              Ctrl+E  │  ← active row highlighted
│ Export: PNG (current page)                   │
│ Export: JPG (current page)                   │
│ Export: SVG (current page)                   │
└──────────────────────────────────────────────┘
```

## Interaction notes

- The three panels behave as docks: settings and thumbnails toggle off for a
  focused writing mode; the editor keeps a minimum width and the preview
  flexes. Below 900 px the settings dock hides automatically (responsive).
- Preview modes: continuous scroll (default), single page and two-page spread
  share the same virtualised page component; single/two add ‹ › paging.
- Every toolbar action is also in the palette and (where sensible) on a
  shortcut; tooltips show the binding.
- Toasts confirm saves/exports and surface errors non-modally.
- Theme, contrast and UI scale live under Settings → Application and apply
  instantly via CSS custom properties.
