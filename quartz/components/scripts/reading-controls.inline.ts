const readerPreference = () => localStorage.getItem("reader-mode") !== "off"
const applyReaderMode = () => {
  const enabled = readerPreference()
  document.documentElement.setAttribute("reader-mode", enabled ? "on" : "off")
  document.querySelectorAll(".reading-toggle").forEach((button) => {
    button.setAttribute("aria-pressed", String(enabled))
  })
}

applyReaderMode()
document.addEventListener("nav", () => {
  applyReaderMode()
  const button = document.querySelector<HTMLButtonElement>(".reading-toggle")
  const toggle = () => {
    localStorage.setItem("reader-mode", readerPreference() ? "off" : "on")
    applyReaderMode()
    document.dispatchEvent(
      new CustomEvent("readermodechange", {
        detail: { mode: readerPreference() ? "on" : "off" },
      }),
    )
  }
  button?.addEventListener("click", toggle)
  window.addCleanup(() => button?.removeEventListener("click", toggle))

  const input = document.querySelector<HTMLInputElement>(".search-bar")
  const activateSearch = () => {
    document.querySelector<HTMLButtonElement>(".search-button")?.click()
  }
  input?.addEventListener("focus", activateSearch)
  window.addCleanup(() => input?.removeEventListener("focus", activateSearch))
})
