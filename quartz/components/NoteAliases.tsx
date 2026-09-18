import type { QuartzComponent } from "./types"

const NoteAliases: QuartzComponent = ({ fileData }) => {
  const aliases = fileData.frontmatter?.aliases?.filter((alias) => alias.trim().length > 0)
  if (!aliases?.length) return null

  return (
    <p class="note-aliases">
      <span>Also known as: </span>
      {aliases.join(", ")}
    </p>
  )
}

export default NoteAliases
