# Assets

- `fonts/` — manifest and licence record for the bundled handwriting font pack
  (files live in `apps/renderer/public/fonts/`).
- Paper textures, rulings and page furniture are generated procedurally by
  `@handscript/paper-engine` (vector SVG), so no bitmap paper assets ship
  with the app. Raster paper/ink textures and decorative elements are an
  extension point: add files here and surface them through a new
  `TextureConfig` on `PaperConfig` (see docs/architecture.md → roadmap).
