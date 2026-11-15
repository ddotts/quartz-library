import assert from "node:assert/strict"
import test from "node:test"
import { readSharedPage, wikiPageUrl } from "./sharedPage"

const root = new URL("https://ddotts.github.io/quartz-library/")

test("shared URLs preserve the deployment path and section, and drop query parameters", () => {
  assert.equal(
    wikiPageUrl("lore/the-city?password=secret#history", root)?.href,
    "https://ddotts.github.io/quartz-library/lore/the-city#history",
  )
})

test("room data cannot navigate outside this wiki or into the extension itself", () => {
  for (const url of [
    "https://example.com/page",
    "//example.com/page",
    "javascript:alert(1)",
    "../crowbear/",
    "/quartz-library-lookalike/page",
    "static/owlbear/panel.html",
    "https://user:password@ddotts.github.io/quartz-library/page",
  ]) {
    assert.equal(wikiPageUrl(url, root), undefined, url)
  }
})

test("unrelated or malformed room metadata is ignored", () => {
  for (const value of [
    undefined,
    null,
    "page",
    {},
    { id: "1", url: "lore", title: 3 },
    { id: "1", url: "lore", title: "a".repeat(201) },
    { id: "1", url: "https://example.com/", title: "External" },
  ]) {
    assert.equal(readSharedPage(value, root), undefined)
  }
})

test("the same metadata resolves on GitHub Pages and a local preview", () => {
  const shared = { id: "share-1", title: "The City", url: "lore/the-city" }
  assert.equal(readSharedPage(shared, root)?.url, new URL(shared.url, root).href)
  const local = new URL("http://localhost:8080/")
  assert.equal(readSharedPage(shared, local)?.url, "http://localhost:8080/lore/the-city")
})
