# Handwriting font pack

The built-in handwriting styles reference the following open-licence fonts.
Copies used by the app live in `apps/renderer/public/fonts/`; this document is
the manifest and licence record.

| Family              | Style(s) using it | Licence    | Source                                |
| ------------------- | ----------------- | ---------- | ------------------------------------- |
| Patrick Hand        | Print             | OFL 1.1    | google/fonts `ofl/patrickhand`        |
| Comic Neue          | Print, School     | OFL 1.1    | google/fonts `ofl/comicneue`          |
| Dancing Script      | Cursive           | OFL 1.1    | google/fonts `ofl/dancingscript`      |
| Schoolbell          | School            | Apache 2.0 | google/fonts `apache/schoolbell`      |
| Great Vibes         | Elegant           | OFL 1.1    | google/fonts `ofl/greatvibes`         |
| Tangerine           | Calligraphy       | OFL 1.1    | google/fonts `ofl/tangerine`          |
| Architects Daughter | Technical         | OFL 1.1    | google/fonts `ofl/architectsdaughter` |

All families fall back to the platform `cursive` generic, so the app remains
fully functional if the pack is removed (offline-first requirement).

## Installing custom fonts

Drop additional `.ttf`/`.woff2` files into `apps/renderer/public/fonts/` and
add a matching `@font-face` rule to `fonts.css`, then reference the family
name in a style definition (`packages/handwriting-engine/src/styles.ts`).
Only static font files are loaded — the app never executes font-embedded
code, and the packaged app's CSP restricts font loading to `'self'`/`data:`.

Licences: the SIL Open Font License 1.1 and Apache License 2.0 both permit
bundling and redistribution with attribution; see the upstream repositories
for the full texts.
