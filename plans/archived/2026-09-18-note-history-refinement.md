# Note history and search refinements

- Recent searches now stores notes reached through search, rather than query text.
- Records successful mouse and Enter arrivals, including full page reloads.
- A scoped 60-second cookie carries the selected destination and is consumed on navigation.
- Stores up to five searched notes and ten viewed notes in existing 30-day cookies.
- Recently viewed excludes all notes currently in recent searches.
- Display remains five per list on homepage and three per list in the sidebar.
- Legacy query-string history is ignored; history links open notes directly.
- Search results have no borders, backgrounds, or shadows; page fade/blur remains.
- Focused search input has one border and no extra outline or shadow.
- Link preview animation waits 450ms (original 200ms plus requested 250ms).

Validation: typecheck and scoped formatting checks pass; live preview rebuilt.
Browser checks cover mouse/Enter arrivals, persistence, ten-view cap, exclusions,
display limits, old-cookie migration, empty results, and history navigation.
Desktop/mobile search and homepage screenshots visually inspected.
Popover remains hidden at 300ms, animates after 450ms, and cancels on early leave.
Server remains running at http://localhost:8080; changes remain uncommitted.
