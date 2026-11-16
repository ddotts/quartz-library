import assert from "node:assert/strict"
import { setImmediate } from "node:timers/promises"
import { runInNewContext } from "node:vm"
import { build } from "esbuild"
import test from "node:test"
import { SHARED_PAGE_KEY } from "./sharedPage"

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

async function fixture(panel = false, role = "PLAYER") {
  const notifications = new Set<string>()
  const updates: Record<string, unknown>[] = []
  const timers: { callback: () => void; ms: number }[] = []
  const elements = new Map<string, ReturnType<typeof element>>()
  const errors: string[] = []
  let onMetadata = (_metadata: Record<string, unknown>) => {}
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
      player: { getRole: async () => role, onChange: () => {} },
      room: {
        getMetadata: async () => ({}),
        onMetadataChange: (callback: typeof onMetadata) => (onMetadata = callback),
        setMetadata: async (update: Record<string, unknown>) => updates.push(update),
      },
      action: { setBadgeText: async () => {} },
      notification: {
        show: async (message: string) => {
          notifications.add(message)
          return message
        },
        close: async (id: string) => notifications.delete(id),
      },
    },
  })
  await setImmediate()
  return { notifications, updates, timers, elements, errors, receive: onMetadata }
}

test("shared-page notifications close after six seconds, including overlapping shares", async () => {
  const app = await fixture()
  app.receive({ [SHARED_PAGE_KEY]: page("1") })
  app.receive({ [SHARED_PAGE_KEY]: page("2") })
  await setImmediate()
  assert.equal(app.notifications.size, 2)
  for (const timer of app.timers) {
    assert.equal(timer.ms, 6000)
    timer.callback()
  }
  await setImmediate()
  assert.equal(app.notifications.size, 0)
  assert.deepEqual(app.errors, [])
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
  app.elements.get("#open-shared")!.click()
  assert.equal(frame.src, page("2").url)
})

test("GMs receive shared-page notifications too", async () => {
  const app = await fixture(false, "GM")
  app.receive({ [SHARED_PAGE_KEY]: page("1") })
  await setImmediate()
  assert.equal(app.notifications.size, 1)
})
