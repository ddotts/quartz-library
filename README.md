# Quartz v5

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Owlbear Rodeo

The wiki can be installed as an Owlbear Rodeo extension. After deploying the site,
add this manifest URL on your Owlbear profile's **Extensions** page:

```text
https://ddotts.github.io/quartz-library/static/owlbear/manifest.json
```

Enable **Quartz Library** in your room, then click **Campaign Wiki** to search and
browse the wiki in a 600 × 700 panel. Each participant browses independently.
Anyone can click **Share page** to share the current page with the room. Everyone
receives an Owlbear notification that dismisses after six seconds, even with the
panel closed, and can click
**Open shared page** in the panel when they want to read it. Sharing never
automatically changes another participant's page. **Home** returns to wiki search.

The room stores only the latest shared URL and title, available to late joiners
and after reopening the panel. A dot on the extension icon means a shared page
is available. Each new share replaces the previous link. Both GMs and players
can share pages.
Page contents and decryption passwords are not sent to Owlbear. Shared URLs omit
query parameters, and encrypted pages still require each reader's password.

The source manifest is `quartz/static/owlbear/manifest.json`; Quartz copies it and
the panel's HTML/CSS to `public/static/owlbear/` during `npx quartz build`. The
`Owlbear` emitter bundles `quartz/owlbear/integration.ts` and the Owlbear SDK into
that directory. Following Crowbear's
hosting convention, all manifest resources use absolute URLs with the GitHub Pages
repository path. If the site's hosting URL changes, update these URLs alongside
`configuration.baseUrl` in `quartz.config.yaml`.

For a local preview, run `npx quartz build --serve` and open
`http://localhost:8080/static/owlbear/panel.html` at the panel dimensions.
The standalone preview supports browsing and explains that sharing needs a room.
To install a local build in
Owlbear, serve it at an address accessible to Owlbear and use a temporary copy of
the manifest whose icon, popover and background URLs point to that address.
With Quartz's local server, use extensionless `/static/owlbear/panel` and
`/static/owlbear/background` URLs to avoid its HTML redirects dropping SDK query
parameters. Preview at the origin root: the local `--baseDir` preview currently
loses the prefix on some search links and redirects. The published manifest keeps
explicit `.html` URLs for GitHub Pages. Local previews do not verify installation
in an authenticated Owlbear room.

See the [Owlbear manifest reference](https://docs.owlbear.rodeo/extensions/reference/manifest/)
for the extension format. Room sharing uses the SDK and a background listener;
no additional manifest permissions are required. Verify the live integration with
a GM and player in the same room: share from each role with the other's panel
closed, check that the notification dismisses after six seconds, open the panel,
then open the shared page. Also check that sharing
leaves a player's current page alone and survives closing and reopening the panel.

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
