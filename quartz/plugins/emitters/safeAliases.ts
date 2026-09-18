import path from "node:path"
import { stat } from "node:fs/promises"
import { VFile } from "vfile"
import { isRelativeURL, simplifySlug, type FullSlug } from "../../util/path"
import type { BuildCtx } from "../../util/ctx"
import type { ProcessedContent } from "../vfile"
import type { QuartzEmitterPluginInstance } from "../types"

async function fileIdentity(filePath: string): Promise<string | undefined> {
  try {
    const file = await stat(filePath)
    return `${file.dev}:${file.ino}`
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

const canonicalUrl = (slug: string) =>
  simplifySlug(path.normalize(slug) as FullSlug).replace(/\/$/, "")

async function aliasFilter(ctx: BuildCtx, content: ProcessedContent[]) {
  const pages = [...content, ...ctx.virtualPages]
  const canonicalUrls = new Set(pages.map(([, file]) => canonicalUrl(file.data.slug!)))
  const identities = new Set(
    await Promise.all(
      pages.map(([, file]) => fileIdentity(path.join(ctx.argv.output, `${file.data.slug}.html`))),
    ),
  )
  identities.delete(undefined)

  return async (file: VFile): Promise<VFile> => {
    if (!file.data.aliases?.length) return file
    const slug = simplifySlug(file.data.slug!)
    const aliases = await Promise.all(
      file.data.aliases.map(async (alias) => {
        // Match the installed AliasRedirects emitter's relative target resolution.
        const target = isRelativeURL(alias) ? path.normalize(path.join(slug, "..", alias)) : alias
        if (canonicalUrls.has(canonicalUrl(target))) return undefined
        const identity = await fileIdentity(path.join(ctx.argv.output, `${target}.html`))
        return identities.has(identity) ? undefined : alias
      }),
    )
    const clone = new VFile({ ...file, data: { ...file.data } })
    clone.data.aliases = aliases.filter((alias): alias is FullSlug => alias !== undefined)
    return clone
  }
}

export function SafeAliases(emitter: QuartzEmitterPluginInstance): QuartzEmitterPluginInstance {
  return {
    ...emitter,
    async *emit(ctx, content, resources) {
      const filter = await aliasFilter(ctx, content)
      const safeContent = await Promise.all(
        content.map(async ([tree, file]): Promise<ProcessedContent> => [tree, await filter(file)]),
      )
      yield* await emitter.emit(ctx, safeContent, resources)
    },
    partialEmit: emitter.partialEmit
      ? async function* (ctx, content, resources, changeEvents) {
          const filter = await aliasFilter(ctx, content)
          const safeEvents = await Promise.all(
            changeEvents.map(async (event) => ({
              ...event,
              file: event.file ? await filter(event.file) : undefined,
            })),
          )
          const result = await emitter.partialEmit!(ctx, content, resources, safeEvents)
          if (result) yield* result
        }
      : undefined,
  }
}
