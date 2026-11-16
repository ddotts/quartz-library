import assert from "node:assert/strict"
import { setImmediate } from "node:timers/promises"
import { runInNewContext } from "node:vm"
import { build } from "esbuild"
import test from "node:test"
import { OPENED_PAGE_CHANNEL, SHARED_PAGE_KEY } from "./sharedPage"

const bundle = await build({
  entryPoints: ["quartz/owlbear/integration.ts"],
  bundle: true,
  write: false,
  format: "iife",
  plugins: [
    {
      name: "sdk-fixture",
      setup(builder) {
        builder.onResolve({ filter: /^@owlbear-rodeo\/sdk$/ }, () => ({
          path: "sdk",
          namespace: "fixture",
        }))
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: "export default globalThis.__obr",
        }))
      },
    },
  ],
})

const page = (id: string) => ({
  id,
  title: `Note ${id}`,
  url: `https://ddotts.github.io/quartz-library/note-${id}`,
})

async function fixture(panel = false, role = "PLAYER", deferNotification = false) {
  const notifications = new Set<string>()
  const updates: Record<string, unknown>[] = []
  const timers: { callback: () => void; ms: number }[] = []
  const elements = new Map<string, ReturnType<typeof element>>()
  const errors: string[] = []
  const broadcasts: { channel: string; data: unknown; destination: string }[] = []
  let onMetadata = (_metadata: Record<string, unknown>) => {}
  let onOpened = (_event: { connectionId: string; data: unknown }) => {}
  let resolveShow = () => {}
  function element() {
    const listeners = new Map<string, () => void>()
    return {
      hidden: true,
      disabled: true,
      textContent: "",
      title: "",
      src: "https://ddotts.github.io/quartz-library/",
      contentWindow: {
        location: { href: page("1").url },
        document: { title: page("1").title },
      },
      addEventListener: (event: string, callback: () => void) => listeners.set(event, callback),
      click: () => listeners.get("click")?.(),
      load(url: string) {
        this.contentWindow.location.href = url
        listeners.get("load")?.()
      },
    }
  }
  if (panel)
    for (const id of ["#wiki", "#share", "#open-shared", "#status"]) elements.set(id, element())
  const schedule = (callback: () => void, ms: number) => timers.push({ callback, ms })
  runInNewContext(bundle.outputFiles[0].text, {
    URL,
    crypto,
    location: { href: "https://ddotts.github.io/quartz-library/static/owlbear/panel.html" },
    document: { querySelector: (selector: string) => elements.get(selector) ?? null },
    console: { error: (message: string) => errors.push(message) },
    window: { setTimeout: schedule },
    setTimeout: schedule,
    __obr: {
      isAvailable: true,
      onReady: (callback: () => void) => callback(),
      player: {
        getRole: async () => role,
        getConnectionId: async () => "local",
        onChange: () => {},
      },
      broadcast: {
        onMessage: (channel: string, callback: typeof onOpened) => {
          assert.equal(channel, OPENED_PAGE_CHANNEL)
          onOpened = callback
        },
        sendMessage: async (channel: string, data: unknown, options: { destination: string }) => {
          broadcasts.push({ channel, data, destination: options.destination })
        },
      },
      room: {
        getMetadata: async () => ({}),
        onMetadataChange: (callback: typeof onMetadata) => (onMetadata = callback),
        setMetadata: async (update: Record<string, unknown>) => updates.push(update),
      },
      action: { setBadgeText: async () => {} },
      notification: {
        show: async (message: string) => {
          notifications.add(message)
          if (deferNotification) await new Promise<void>((resolve) => (resolveShow = resolve))
          return message
        },
        close: async (id: string) => notifications.delete(id),
      },
    },
  })
  await setImmediate()
  return {
    notifications,
    updates,
    timers,
    elements,
    errors,
    broadcasts,
    receive: onMetadata,
    receiveOpened: (data: unknown, connectionId = "local") => onOpened({ connectionId, data }),
    resolveNotification: () => resolveShow(),
  }
}

test("notifications stay until this participant opens the shared page", async () => {
  const app = await fixture()
  const other = await fixture()
  app.receive({ [SHARED_PAGE_KEY]: page("1") })
  other.receive({ [SHARED_PAGE_KEY]: page("1") })
  await setImmediate()
  assert.equal(app.notifications.size, 1)
  assert.equal(app.timers.length, 0)
  app.receiveOpened("1", "another-player")
  app.receiveOpened("unknown-share")
  await setImmediate()
  assert.equal(app.notifications.size, 1)
  app.receiveOpened("1")
  await setImmediate()
  assert.equal(app.notifications.size, 0)
  assert.equal(other.notifications.size, 1)
  assert.deepEqual(app.errors, [])
})

test("opening an older share leaves newer notifications until those pages are opened", async () => {
  const app = await fixture()
  for (const id of ["1", "2", "3"]) app.receive({ [SHARED_PAGE_KEY]: page(id) })
  await setImmediate()
  app.receiveOpened("2")
  await setImmediate()
  assert.equal(app.notifications.size, 1)
  assert.match([...app.notifications][0], /Note 3/)
  app.receiveOpened("3")
  await setImmediate()
  assert.equal(app.notifications.size, 0)
})

test("an acknowledgement before the notification ID resolves still dismisses it", async () => {
  const app = await fixture(false, "PLAYER", true)
  app.receive({ [SHARED_PAGE_KEY]: page("1") })
  app.receiveOpened("1")
  app.resolveNotification()
  await setImmediate()
  assert.equal(app.notifications.size, 0)
})

test("players can share a page without changing another reader's page", async () => {
  const app = await fixture(true)
  const share = app.elements.get("#share")!
  assert.equal(share.hidden, false)
  assert.equal(share.disabled, false)
  share.click()
  await setImmediate()
  assert.equal(app.updates.length, 1)
  const shared = app.updates[0][SHARED_PAGE_KEY] as ReturnType<typeof page>
  assert.equal(shared.url, page("1").url)
  assert.equal(shared.title, page("1").title)
  const frame = app.elements.get("#wiki")!
  app.receive({ [SHARED_PAGE_KEY]: page("2") })
  assert.equal(frame.src, "https://ddotts.github.io/quartz-library/")
  assert.equal(app.broadcasts.length, 0)
  app.elements.get("#open-shared")!.click()
  assert.equal(frame.src, page("2").url)
  assert.equal(app.broadcasts.length, 0)
  frame.load(page("1").url)
  assert.equal(app.broadcasts.length, 0)
  app.receive({ [SHARED_PAGE_KEY]: page("3") })
  frame.load(page("2").url)
  assert.deepEqual(app.broadcasts, [
    { channel: OPENED_PAGE_CHANNEL, data: "2", destination: "LOCAL" },
  ])
})

test("GMs receive shared-page notifications too", async () => {
  const app = await fixture(false, "GM")
  app.receive({ [SHARED_PAGE_KEY]: page("1") })
  await setImmediate()
  assert.equal(app.notifications.size, 1)
})
