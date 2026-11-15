export const SHARED_PAGE_KEY = "com.ddotts.quartz-library/shared-page"

export interface SharedPage {
  id: string
  url: string
  title: string
}

// Only wiki URLs may be opened from room metadata. Never carry query parameters
// (which could contain credentials) into the room.
export function wikiPageUrl(value: string, siteRoot: URL): URL | undefined {
  try {
    const url = new URL(value, siteRoot)
    if (
      url.origin !== siteRoot.origin ||
      !url.pathname.startsWith(siteRoot.pathname) ||
      url.pathname.startsWith(`${siteRoot.pathname}static/`) ||
      url.username ||
      url.password
    )
      return undefined
    url.search = ""
    return url
  } catch {
    return undefined
  }
}

export function readSharedPage(value: unknown, siteRoot: URL): SharedPage | undefined {
  if (!value || typeof value !== "object") return undefined
  const page = value as Partial<SharedPage>
  if (
    typeof page.id !== "string" ||
    typeof page.title !== "string" ||
    typeof page.url !== "string" ||
    page.id.length > 100 ||
    page.title.length > 200 ||
    page.url.length > 2048
  )
    return undefined
  const url = wikiPageUrl(page.url, siteRoot)
  return url ? { id: page.id, title: page.title, url: url.href } : undefined
}
