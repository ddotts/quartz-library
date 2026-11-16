import OBR from "@owlbear-rodeo/sdk"
import {
  OPENED_PAGE_CHANNEL,
  readSharedPage,
  SHARED_PAGE_KEY,
  wikiPageUrl,
  type SharedPage,
} from "./sharedPage"

const siteRoot = new URL("../../", location.href)
const frame = document.querySelector<HTMLIFrameElement>("#wiki")
const share = document.querySelector<HTMLButtonElement>("#share")
const open = document.querySelector<HTMLButtonElement>("#open-shared")
const status = document.querySelector<HTMLElement>("#status")

function report(message: string) {
  if (status) status.textContent = message
  else console.error(message)
}

async function start() {
  let shared: SharedPage | undefined
  let observedChange = false
  const notifications: { shareId: string; notification: Promise<string> }[] = []
  if (!frame) {
    const connectionId = await OBR.player.getConnectionId()
    OBR.broadcast.onMessage(OPENED_PAGE_CHANNEL, (event) => {
      if (event.connectionId !== connectionId) return
      const index = notifications.findIndex((notice) => notice.shareId === event.data)
      if (index === -1) return
      // Opening a newer share also clears notices for the pages it replaced.
      // Keep any share that arrived while this page was loading.
      for (const notice of notifications.splice(0, index + 1)) {
        void notice.notification
          .then((id) => OBR.notification.close(id))
          .catch(() => report("Could not dismiss the shared-page notification."))
      }
    })
  }
  const receive = (metadata: Record<string, unknown>, notify: boolean) => {
    const next = readSharedPage(metadata[SHARED_PAGE_KEY], siteRoot)
    const changed = next?.id !== shared?.id
    shared = next
    if (open) {
      open.disabled = !shared
      open.title = shared?.title ?? "No page shared yet"
    }
    if (frame) {
      if (changed && shared) report(`Shared: ${shared.title}`)
    } else if (changed) {
      void OBR.action.setBadgeText(shared ? "•" : undefined).catch(() => {
        report("Could not update the wiki badge.")
      })
      if (notify && shared) {
        const notification = OBR.notification.show(
          `Wiki: ${shared.title}. Click Open shared page in Campaign Wiki to read it.`,
          "INFO",
        )
        notifications.push({ shareId: shared.id, notification })
        void notification.catch(() => report("Could not show the shared-page notification."))
      }
    }
  }
  OBR.room.onMetadataChange((metadata) => {
    observedChange = true
    receive(metadata, true)
  })
  const metadata = await OBR.room.getMetadata()
  if (!observedChange) receive(metadata, false)

  let opening: SharedPage | undefined
  frame?.addEventListener("load", () => {
    if (!opening) return
    try {
      if (frame.contentWindow?.location.href !== opening.url) return
    } catch {
      return // An external link may finish loading before the requested wiki page.
    }
    const openedId = opening.id
    opening = undefined
    void OBR.broadcast
      .sendMessage(OPENED_PAGE_CHANNEL, openedId, { destination: "LOCAL" })
      .catch(() =>
        report("Page opened, but its notification could not be dismissed. Try opening it again."),
      )
  })
  open?.addEventListener("click", () => {
    if (shared && frame) {
      opening = shared
      frame.src = shared.url
    }
  })
  share?.addEventListener("click", () => {
    void (async () => {
      share.disabled = true
      try {
        const current = frame?.contentWindow
        const url = current && wikiPageUrl(current.location.href, siteRoot)
        if (!url) throw new Error("Open a wiki page before sharing.")
        const page: SharedPage = {
          id: crypto.randomUUID(),
          url: url.href,
          title: (current.document.title || "Campaign wiki").slice(0, 200),
        }
        if (page.url.length > 2048) throw new Error("This page's URL is too long to share.")
        await OBR.room.setMetadata({ [SHARED_PAGE_KEY]: page })
        report(`Shared with the room: ${page.title}`)
      } catch (error) {
        report(error instanceof Error ? error.message : "Could not share this page. Try again.")
      } finally {
        share.disabled = false
      }
    })()
  })
  if (share) {
    share.hidden = false
    share.disabled = false
  }
  if (status && !shared) report("Browse independently, or open the room's latest shared page.")
}

if (OBR.isAvailable) {
  OBR.onReady(() => {
    void start().catch(() =>
      report("Could not connect to the room. Reopen Campaign Wiki to retry."),
    )
  })
} else {
  report("Browsing preview. Open this extension in Owlbear Rodeo to share pages.")
}
