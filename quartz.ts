import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { frameRegistry } from "./quartz/components/frames/registry"
import { SearchHomeFrame } from "./quartz/components/frames/SearchHomeFrame"
import { componentRegistry } from "./quartz/components/registry"
import type { QuartzComponentConstructor } from "./quartz/components/types"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes/dispatcher"
import ReadingControls from "./quartz/components/ReadingControls"
import RecentHistory from "./quartz/components/RecentHistory"

const config = await loadQuartzConfig()
export default config

const search = componentRegistry.instantiate(
  componentRegistry.get("search")!.component as QuartzComponentConstructor,
  { enablePreview: false },
)
const emptyFooter = () => null
frameRegistry.register(SearchHomeFrame.name, SearchHomeFrame, "site")
export const layout = await loadQuartzLayout({
  byPageType: {
    content: { frame: SearchHomeFrame.name },
    "404": { frame: "default" },
  },
})
for (const pageLayout of [layout.defaults, ...Object.values(layout.byPageType)]) {
  pageLayout.header = [search, ReadingControls]
  pageLayout.footer = emptyFooter
  const left = pageLayout.left ?? []
  pageLayout.left = [...left.slice(0, 1), RecentHistory, ...left.slice(1)]
}

// The loader creates its dispatcher before these project-specific overrides.
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher" ? PageTypeDispatcher(layout) : emitter,
)
