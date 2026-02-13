const FIRECRAWL_API = 'https://api.firecrawl.dev/v1'

export interface FirecrawlResult {
  markdown: string
  html: string
  metadata: Record<string, string>
}

export async function firecrawlScrape(url: string): Promise<FirecrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!res.ok) return null

    const json = await res.json()
    if (!json.success) return null

    return {
      markdown: json.data?.markdown || '',
      html: json.data?.html || json.data?.rawHtml || '',
      metadata: json.data?.metadata || {},
    }
  } catch {
    return null
  }
}

export interface FirecrawlSearchResult {
  title: string
  url: string
  description: string
}

export async function firecrawlSearch(
  query: string,
  limit = 20
): Promise<FirecrawlSearchResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${FIRECRAWL_API}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!res.ok) return []

    const json = await res.json()
    if (!json.success || !Array.isArray(json.data)) return []

    return json.data
      .filter((r: Record<string, unknown>) => r.url && typeof r.url === 'string')
      .map((r: Record<string, unknown>) => ({
        title: (r.title as string) || '',
        url: r.url as string,
        description: (r.description as string) || '',
      }))
  } catch {
    return []
  }
}
