import type { QuartzComponent } from "./types"
// @ts-ignore: inline scripts are bundled as strings by Quartz
import script from "./scripts/reading-controls.inline"

const ReadingControls: QuartzComponent = ({ fileData }) =>
  fileData.slug === "index" ? null : (
    <button class="reading-toggle" aria-label="Toggle reader mode" aria-pressed="true">
      Reader mode
    </button>
  )

ReadingControls.beforeDOMLoaded = script
export default ReadingControls
