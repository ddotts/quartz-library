# Search history and interaction polish

- Either sidebar hover/focus reveals both TOC and backlinks in reader mode.
- Note search header stays fixed; search borders match Amber Cathode headings.
- Homepage search sits in the upper third with recent searches and reads beneath.
- History uses scoped 30-day SameSite=Lax cookies, Secure on HTTPS.
- Lists deduplicate by recency: five each on homepage, three each below sidebar TOC.
- Searches are recorded on Enter/result selection; history buttons rerun queries.
- Read history updates on navigation and excludes homepage/404.
- Local and global graphs omit tag nodes.
- Search uses an opaque bordered results panel over a dimmed, blurred backdrop.
- Backdrop fades over 180ms, respects reduced motion, and closes on Escape/outside click.
- Mobile active search uses full header width and restores reader controls on dismissal.

Validation: typecheck/build pass; browser checks cover fixed header scroll position,
both-sidebar hover, graph config, cookie limits/dedup/persistence, deployed base path,
history navigation, desktop/mobile screenshots, overlay dismissal, and SPA cleanup.
Changes remain uncommitted for review at localhost:8080.
