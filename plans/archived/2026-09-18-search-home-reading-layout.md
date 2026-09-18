# Search homepage and reading layout

- Added an unlisted homepage containing only a centered native search input.
- Reused indexed search in note headers, with keyboard navigation and dropdown results.
- Added default-on reader mode with a persistent visitor preference.
- Hid the site title, footer, and properties panel; preserved frontmatter parsing.
- Changed ordinary article text to #fec while retaining Amber Cathode accents.
- Moved TOC to the left and backlinks above the bottom-right desktop graph.
- Kept graph visible in reader mode; mobile graph follows the note to avoid overlap.
- Wired the custom layout into PageTypeDispatcher because this fork ignores the exported layout alone.
- Preserved previously disabled Explorer, folder pages, and tag pages.

Validation: TypeScript and site build pass. Browser checks cover homepage search,
result navigation, keyboard controls, reader preference persistence, console errors,
and desktop/mobile layout. Final graph visibility check performed by root.

Changes remain uncommitted for user review in the running localhost:8080 preview.
