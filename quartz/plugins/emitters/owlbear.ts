import { build } from "esbuild"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../types"
import type { BuildCtx } from "../../util/ctx"
import type { FilePath } from "../../util/path"

export const Owlbear: QuartzEmitterPlugin = () => {
  async function emit(ctx: BuildCtx): Promise<FilePath[]> {
    const outfile = path.join(ctx.argv.output, "static/owlbear/integration.js")
    await build({
      entryPoints: ["quartz/owlbear/integration.ts"],
      outfile,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      minify: true,
    })
    return [outfile as FilePath]
  }
  return { name: "Owlbear", emit, partialEmit: emit }
}
