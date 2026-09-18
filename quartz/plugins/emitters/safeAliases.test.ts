import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { AliasRedirects } from "../../../.quartz/plugins/alias-redirects/dist/index.js"
import type { BuildCtx } from "../../util/ctx"
import type { FilePath, FullSlug } from "../../util/path"
import type { StaticResources } from "../../util/resources"
import type { QuartzEmitterPluginInstance } from "../types"
import { defaultProcessedContent, type ProcessedContent } from "../vfile"
import { SafeAliases } from "./safeAliases"

const resources = {} as StaticResources
const note = (slug: string, aliases: string[] = []) =>
  defaultProcessedContent({ slug: slug as FullSlug, aliases: aliases as FullSlug[] })

async function fixture(content: ProcessedContent[], virtualPages: ProcessedContent[] = []) {
  const output = await mkdtemp(path.join(os.tmpdir(), "quartz-safe-aliases-"))
  for (const [, file] of [...content, ...virtualPages]) {
    const filePath = path.join(output, `${file.data.slug}.html`)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, `canonical:${file.data.slug}`)
  }
  const ctx = { argv: { output }, virtualPages } as BuildCtx
  const emitter = SafeAliases(
    AliasRedirects({ enableCaseRedirects: false }) as unknown as QuartzEmitterPluginInstance,
  )
  return { ctx, emitter, output }
}

test("aliases cannot replace canonical notes, folder URLs or virtual pages", async () => {
  const content = [
    note("weiss", ["weiss", "other", "folder", "folder/index", "map", "poet’s-alias"]),
    note("other"),
    note("folder/index"),
    note("nested/source", ["../other", "./friend"]),
  ]
  const snapshot = structuredClone(content.map(([, file]) => file.data))
  const { ctx, emitter, output } = await fixture(content, [note("map")])
  try {
    for await (const _ of await emitter.emit(ctx, content, resources)) {
    }
    for (const slug of ["weiss", "other", "folder/index", "map", "nested/source"]) {
      assert.equal(await readFile(path.join(output, `${slug}.html`), "utf8"), `canonical:${slug}`)
    }
    await assert.rejects(stat(path.join(output, "folder.html")), { code: "ENOENT" })
    assert.match(await readFile(path.join(output, "poet’s-alias.html"), "utf8"), /url=\.\/weiss/)
    assert.match(
      await readFile(path.join(output, "nested/friend.html"), "utf8"),
      /url=\.\.\/nested\/source/,
    )
    assert.deepEqual(
      content.map(([, file]) => file.data),
      snapshot,
    )
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

test("partial aliases protect unchanged notes and preserve change event metadata", async () => {
  const content = [note("source", ["unchanged", "valid"]), note("unchanged")]
  const { ctx, emitter, output } = await fixture(content)
  const events = [{ type: "change" as const, path: "source.md" as FilePath, file: content[0][1] }]
  try {
    for await (const _ of (await emitter.partialEmit!(ctx, content, resources, events))!) {
    }
    assert.equal(await readFile(path.join(output, "unchanged.html"), "utf8"), "canonical:unchanged")
    assert.match(await readFile(path.join(output, "valid.html"), "utf8"), /url=\.\/source/)
    assert.deepEqual(events[0].file.data.aliases, ["unchanged", "valid"])
    assert.equal(events[0].file, content[0][1])
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

test("Unicode aliases follow actual filesystem identity", async () => {
  const content = [note("weiss", ["weiß"])]
  const { ctx, emitter, output } = await fixture(content)
  try {
    const canonical = path.join(output, "weiss.html")
    const alias = path.join(output, "weiß.html")
    const canonicalStat = await stat(canonical)
    const aliasStat = await stat(alias).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return undefined
      throw error
    })
    const collides = aliasStat?.ino === canonicalStat.ino && aliasStat?.dev === canonicalStat.dev
    for await (const _ of await emitter.emit(ctx, content, resources)) {
    }
    assert.equal(await readFile(canonical, "utf8"), "canonical:weiss")
    if (!collides) assert.match(await readFile(alias, "utf8"), /url=\.\/weiss/)
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

test("installed case redirects and emitter resources remain available", async () => {
  const content = [note("source")]
  content[0][1].data.relativePath = "Source.md" as FilePath
  const { ctx, output } = await fixture(content)
  const original = AliasRedirects() as unknown as QuartzEmitterPluginInstance
  original.getQuartzComponents = () => []
  original.externalResources = () => ({})
  const wrapped = SafeAliases(original)
  try {
    assert.equal(wrapped.getQuartzComponents, original.getQuartzComponents)
    assert.equal(wrapped.externalResources, original.externalResources)
    const casePath = path.join(output, "Source.html")
    const alreadyExists = await stat(casePath).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return false
        throw error
      },
    )
    for await (const _ of await wrapped.emit(ctx, content, resources)) {
    }
    assert.equal(await readFile(path.join(output, "source.html"), "utf8"), "canonical:source")
    if (!alreadyExists) assert.match(await readFile(casePath, "utf8"), /url=\.\/source/)
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})
