# Restore notes and render the map

- Reversed the225 deletions from1dbb67c without rewriting published history.
- Verified restored files byte-for-byte against the pre-deletion commit.
- Removed text-only map export; recovered full drawing through Obsidian CLI.
- Retained one native .excalidraw.md source, parsed by the installed plugin.
- Preserved the original public map slug with a scoped generator override.
- Drawing contains155 visible elements; original vault and plugin remain unchanged.
- Typecheck, formatting, full build, and browser checks passed.
- Checked SVG rendering, pan/zoom/reset, mobile, search access, unique map entry,
  restored note rendering, and no browser script errors.
- Publisher caveat: original vault filename lacks .excalidraw.md and Excalidraw
  integration is off, so republishing it unchanged may strip drawing data again.
