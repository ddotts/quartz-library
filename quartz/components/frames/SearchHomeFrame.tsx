import RecentHistory from "../RecentHistory"
import { DefaultFrame } from "./DefaultFrame"
import type { PageFrame } from "./types"

export const SearchHomeFrame: PageFrame = {
  name: "search-home",
  render(props) {
    if (props.componentData.fileData.slug !== "index") return DefaultFrame.render(props)
    return (
      <main class="center search-home" aria-label="Search notes">
        {props.header.map((Component) => (
          <Component {...props.componentData} />
        ))}
        <RecentHistory {...props.componentData} />
      </main>
    )
  },
}
