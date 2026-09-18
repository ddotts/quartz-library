type RecentNote = { slug: string; title: string }
const historyCookiePath = () => `${document.body.dataset.basepath ?? ""}/`
const writeCookie = (name: string, encodedValue: string, maxAge: number) => {
  document.cookie = `${name}=${encodedValue}; Max-Age=${maxAge}; Path=${historyCookiePath()}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
}
const isRecentNote = (entry: unknown): entry is RecentNote =>
  typeof entry === "object" &&
  entry !== null &&
  "slug" in entry &&
  "title" in entry &&
  typeof entry.slug === "string" &&
  typeof entry.title === "string"

function readHistory(name: string, limit: number): RecentNote[] {
  const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${name}=`))
  if (!value) return []
  try {
    const entries: unknown = JSON.parse(decodeURIComponent(value.slice(name.length + 1)))
    // Previously this cookie held query strings. Only note records are retained.
    return Array.isArray(entries) ? entries.filter(isRecentNote).slice(0, limit) : []
  } catch {
    return []
  }
}

const recentSearches = () => readHistory("quartz_recent_searches", 5)
const recentNotes = () => readHistory("quartz_recent_notes", 10)

function writeHistory(name: string, entries: RecentNote[], limit: number) {
  const limited = entries.slice(0, limit)
  let value = encodeURIComponent(JSON.stringify(limited))
  // Stay below the per-cookie size limit, including long Unicode titles.
  while (value.length > 3500 && limited.length > 0) {
    limited.pop()
    value = encodeURIComponent(JSON.stringify(limited))
  }
  writeCookie(name, value, 2592000)
}

function renderHistory() {
  const searched = recentSearches()
  const searchedSlugs = new Set(searched.map((note) => note.slug))
  const viewed = recentNotes().filter((note) => !searchedSlugs.has(note.slug))
  for (const section of document.querySelectorAll<HTMLElement>(".recent-history")) {
    section.hidden = searched.length === 0 && viewed.length === 0
    const limit = Number(section.dataset.historyLimit)
    for (const [selector, entries] of [
      ["[data-recent-searches]", searched],
      ["[data-recent-notes]", viewed],
    ] as const) {
      const list = section.querySelector(selector)!
      list.parentElement!.hidden = entries.length === 0
      list.replaceChildren()
      for (const note of entries.slice(0, limit)) {
        const item = document.createElement("li")
        const link = document.createElement("a")
        link.className = "internal"
        link.href = `${historyCookiePath()}${note.slug.split("/").map(encodeURIComponent).join("/")}`
        link.textContent = note.title
        link.title = note.title
        item.append(link)
        list.append(item)
      }
    }
  }
}

document.addEventListener("nav", () => {
  document.body.classList.remove("searching")
  const pendingSearchSlug = readHistory("quartz_pending_search", 1)[0]?.slug
  writeCookie("quartz_pending_search", "", 0)
  const slug = document.body.dataset.slug
  const title = document.querySelector<HTMLElement>(".recent-history")?.dataset.pageTitle
  if (slug && title && slug !== "index" && slug !== "404") {
    if (pendingSearchSlug === slug) {
      writeHistory(
        "quartz_recent_searches",
        [{ slug, title }, ...recentSearches().filter((note) => note.slug !== slug)],
        5,
      )
    }
    writeHistory(
      "quartz_recent_notes",
      [{ slug, title }, ...recentNotes().filter((note) => note.slug !== slug)],
      10,
    )
  }
  renderHistory()

  const clearHistory = () => {
    for (const name of ["quartz_recent_searches", "quartz_recent_notes", "quartz_pending_search"]) {
      writeCookie(name, "", 0)
    }
    renderHistory()
  }
  const clearButtons = document.querySelectorAll<HTMLButtonElement>(".history-clear")
  for (const button of clearButtons) button.addEventListener("click", clearHistory)
  window.addCleanup(() => {
    for (const button of clearButtons) button.removeEventListener("click", clearHistory)
  })

  const input = document.querySelector<HTMLInputElement>(".search-bar")
  const container = document.querySelector<HTMLElement>(".search-container")
  if (!input || !container) return

  const backdrop = document.createElement("div")
  backdrop.className = "search-backdrop"
  backdrop.setAttribute("aria-hidden", "true")
  document.body.append(backdrop)
  const syncSearchState = () => {
    document.body.classList.toggle(
      "searching",
      container.classList.contains("active") && input.value.trim().length > 0,
    )
  }
  const observer = new MutationObserver(syncSearchState)
  observer.observe(container, { attributes: true, attributeFilter: ["class"] })
  input.addEventListener("input", syncSearchState)
  const dismiss = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    input.blur()
    document.body.classList.remove("searching")
  }
  backdrop.addEventListener("click", dismiss)

  const rememberTarget = (target: HTMLAnchorElement | null) => {
    if (!target?.id) return
    // Native keyboard selection clicks a detached link, triggering a full page load.
    // A short-lived cookie carries the selected destination across that load.
    writeCookie(
      "quartz_pending_search",
      encodeURIComponent(JSON.stringify([{ slug: target.id, title: "" }])),
      60,
    )
  }
  const commitKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.isComposing) {
      rememberTarget(
        container.querySelector<HTMLAnchorElement>(".result-card.focus:not(.no-match)"),
      )
    }
  }
  const click = (event: MouseEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return
    rememberTarget(
      (event.target as HTMLElement).closest<HTMLAnchorElement>("a.result-card:not(.no-match)"),
    )
  }
  // Native keyboard selection removes the results before clicking its detached link.
  // Capture that target early, then record it only when its destination actually loads.
  input.addEventListener("keydown", commitKey, true)
  document.addEventListener("click", click, true)

  const header = document.querySelector<HTMLElement>(".page-header > header")
  const center = header?.closest<HTMLElement>(".center")
  const placeHeader = () => {
    if (!header || !center) return
    const box = center.getBoundingClientRect()
    const style = getComputedStyle(center)
    const leftPadding = parseFloat(style.paddingLeft)
    const rightPadding = parseFloat(style.paddingRight)
    header.style.left = `${box.left + leftPadding}px`
    header.style.width = `${box.width - leftPadding - rightPadding}px`
  }
  const resize = new ResizeObserver(placeHeader)
  if (center) resize.observe(center)
  placeHeader()
  window.addEventListener("resize", placeHeader)

  window.addCleanup(() => {
    observer.disconnect()
    resize.disconnect()
    window.removeEventListener("resize", placeHeader)
    input.removeEventListener("input", syncSearchState)
    input.removeEventListener("keydown", commitKey, true)
    document.removeEventListener("click", click, true)
    backdrop.remove()
    document.body.classList.remove("searching")
  })
})
