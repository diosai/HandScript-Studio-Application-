# User guide

## Writing

Type or paste into the editor on the left — the preview updates live. Blank
lines start new paragraphs. The editor has native spell checking, word wrap,
and Find & Replace (**Ctrl+F**). Word/character/page counts sit in the status
bar. Use the **+ New** tab to work on several documents in one project.

**Import** (toolbar or **Ctrl+I**) accepts `.txt`, `.md` and `.html`. DOCX and
PDF aren't supported yet — save them as text first; the app will tell you the
same if you try.

## Shaping the handwriting

Everything lives in the Settings panel (toggle with **Ctrl+,**):

- **Handwriting style** — six families. _Connected_ styles (cursive, elegant,
  calligraphy) run letters together; the others print them separately. _Size_
  scales the writing; on ruled paper the lines snap to the ruling
  automatically.
- **Seed** — the "which hand wrote this" number. The same seed always produces
  exactly the same page; press **Re-roll (Ctrl+R)** for a fresh take without
  touching anything else.
- **Pen & ink** — ballpoints, pencil, fountain and gel pens. Each simulates
  spread, pressure, edge roughness and dry strokes differently.
- **Randomness** — the master _intensity_ plus per-channel sliders (position,
  angle, size, baseline, letter/word/line spacing). Zero everything for
  eerily neat writing; push it up for a hurried scrawl. Changing randomness
  never changes where lines break.
- **Paper & Page** — template, colours and ruling; page size (A4/A5/Letter/
  Legal/custom), orientation, margins, line height, paragraph spacing,
  header/footer text and page numbers.

## Preview

Zoom 25–200 % with the chip in the corner or **Ctrl+=** / **Ctrl+-**. Switch
between continuous scroll, single page and two-page views in the toolbar; use
the thumbnail rail to jump to a page.

## Projects, saving, recovery

**Ctrl+S** saves a `.hsproj` file (JSON — safe to version-control). The app
autosaves in the background (interval configurable under Settings →
Application); if it ever closes unexpectedly, it offers to recover your work
on next launch. Undo/redo (**Ctrl+Z / Ctrl+Shift+Z**) covers text, title and
every setting change.

## Export & print

- **PDF (Ctrl+E)** — all pages, one file. The desktop app produces vector PDF;
  the browser build rasterises at the chosen DPI.
- **PNG / JPG** — the current page at 96–600 DPI. PNG can have a transparent
  background (Settings → Export) for compositing.
- **SVG** — the current page as an editable vector file.
- **Print (Ctrl+P)** — opens the system dialog; printer choice, copies,
  duplex and scaling are handled there.

## Keyboard shortcuts

| Action              | Shortcut              | Action           | Shortcut     |
| ------------------- | --------------------- | ---------------- | ------------ |
| Command palette     | Ctrl+K                | Save project     | Ctrl+S       |
| New project         | Ctrl+Shift+N          | Open project     | Ctrl+O       |
| New / close tab     | Ctrl+N / Ctrl+W       | Import file      | Ctrl+I       |
| Undo / redo         | Ctrl+Z / Ctrl+Shift+Z | Find & replace   | Ctrl+F       |
| Re-roll handwriting | Ctrl+R                | Export PDF       | Ctrl+E       |
| Print               | Ctrl+P                | Toggle dark mode | Ctrl+Shift+D |
| Zoom in / out       | Ctrl+= / Ctrl+-       | Toggle settings  | Ctrl+,       |

On macOS use ⌘ in place of Ctrl.

## Accessibility

Full keyboard navigation, ARIA-labelled controls and live regions, a
high-contrast mode, and UI scaling from 85–140 % (Settings → Application).

## Responsible use

HandScript Studio generates generic handwriting styles for creative,
educational and formatting purposes. It does not reproduce any real person's
handwriting, and it must not be used to forge documents or signatures or to
misrepresent machine-generated text as a specific person's writing.
