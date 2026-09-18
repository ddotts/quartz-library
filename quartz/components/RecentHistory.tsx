import type { QuartzComponent } from "./types"
// @ts-ignore: inline scripts are bundled as strings by Quartz
import script from "./scripts/recent-history.inline"

const RecentHistory: QuartzComponent = ({ fileData }) => (
  <section
    class="recent-history"
    aria-label="Your recent activity"
    data-history-limit={fileData.slug === "index" ? 5 : 3}
    data-page-title={fileData.frontmatter?.title ?? ""}
    hidden
  >
    <div>
      <h3>Recent searches</h3>
      <ul data-recent-searches></ul>
    </div>
    <div>
      <h3>Recently viewed</h3>
      <ul data-recent-notes></ul>
    </div>
    <button type="button" class="history-clear">
      Clear history
    </button>
  </section>
)

RecentHistory.afterDOMLoaded = script
export default RecentHistory
