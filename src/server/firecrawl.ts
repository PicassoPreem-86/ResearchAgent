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

export async function firecrawlBatchScrape(
  urls: string[]
): Promise<Map<string, FirecrawlResult>> {
  const results = new Map<string, FirecrawlResult>()
  const settled = await Promise.allSettled(
    urls.map(async (url) => {
      const r = await firecrawlScrape(url)
      if (r) results.set(url, r)
    })
  )
  return results
}
