import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { frameRegistry } from "./quartz/components/frames/registry"
import { SearchHomeFrame } from "./quartz/components/frames/SearchHomeFrame"
import { componentRegistry } from "./quartz/components/registry"
import type { QuartzComponentConstructor } from "./quartz/components/types"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes/dispatcher"
import type { QuartzPageTypePluginInstance } from "./quartz/plugins/types"
import ReadingControls from "./quartz/components/ReadingControls"
import RecentHistory from "./quartz/components/RecentHistory"

const config = await loadQuartzConfig()
export default config

// Preserve the published map URL after restoring its native Excalidraw extension.
config.plugins.pageTypes = config.plugins.pageTypes?.map((pageType) => {
  if (pageType.name !== "ExcalidrawPage" || !pageType.generate) return pageType
  const generate = pageType.generate as NonNullable<QuartzPageTypePluginInstance["generate"]>
  return {
    ...pageType,
    generate: (args: Parameters<typeof generate>[0]) =>
      generate(args).map((page) =>
        page.slug === "averwyn-nodal-peak-simplified-map.excalidraw"
          ? { ...page, slug: "averwyn-nodal-peak-simplified-map" }
          : page,
      ),
  }
})

config.plugins.pageTypes = [
  ...(config.plugins.pageTypes ?? []),
  {
    name: "search-home",
    match: () => false,
    generate: ({ content }) =>
      content.some(([, file]) => file.data.slug === "index")
        ? []
        : [{ slug: "index", title: "Search", data: { unlisted: true } }],
    layout: "content",
    body: () => () => null,
  } satisfies QuartzPageTypePluginInstance,
]

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
