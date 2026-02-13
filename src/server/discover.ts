import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import { scrapeCompany } from './scraper.js'
import type { ICP, DiscoveredCompany, GeoTarget } from '../types/prospect.js'
import { geoTargetToQueryString, geoTargetToLabel, hasGeoSelections } from '../types/prospect.js'
import { extractStructuredData } from './scraper.js'

const client = new OpenAI()

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// --- Google search scraping ---

export async function searchGoogle(
  query: string
): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=en`
    const html = await fetchHtml(url)
    if (!html) return []

    const $ = cheerio.load(html)
    const results: { title: string; link: string; snippet: string }[] = []

    // Google wraps each result in a div with class 'g' or similar structures
    $('div.g, div[data-sokoban-container]').each((_, el) => {
      const anchor = $(el).find('a[href^="http"]').first()
      const link = anchor.attr('href') || ''
      const title = $(el).find('h3').first().text().trim()
      // Snippet is typically in a div after the link block
      const snippet =
        $(el).find('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]').first().text().trim() ||
        $(el).find('span.st, div.s').first().text().trim()

      if (link && title && link.startsWith('http')) {
        results.push({ title, link, snippet })
      }
    })

    // Fallback: if the above didn't pick up results, try broader parsing
    if (results.length === 0) {
      $('a[href^="/url?q="]').each((_, el) => {
        const rawHref = $(el).attr('href') || ''
        const match = rawHref.match(/\/url\?q=([^&]+)/)
        if (!match) return
        const link = decodeURIComponent(match[1])
        if (!link.startsWith('http') || link.includes('google.com')) return
        const title = $(el).text().trim()
        if (title && title.length > 3) {
          results.push({ title, link, snippet: '' })
        }
      })
    }

    return results.slice(0, 20)
  } catch {
    return []
  }
}

// --- Product Hunt search ---

export async function searchProductHunt(
  query: string
): Promise<{ name: string; domain: string; tagline: string }[]> {
  try {
    const url = `https://www.producthunt.com/search?q=${encodeURIComponent(query)}`
    const html = await fetchHtml(url)
    if (!html) return []

    const $ = cheerio.load(html)
    const results: { name: string; domain: string; tagline: string }[] = []

    // PH renders product cards with data attributes or structured divs
    $('[data-test="post-item"], .post-item, [class*="styles_item"]').each((_, el) => {
      const name = $(el).find('h3, [data-test="post-name"], [class*="title"]').first().text().trim()
      const tagline = $(el).find('[class*="tagline"], [data-test="post-tagline"], p').first().text().trim()
      const link = $(el).find('a[href]').first().attr('href') || ''

      if (name) {
        // Extract domain from the link or use a slug
        const domainMatch = link.match(/https?:\/\/([^/?#]+)/)
        const domain = domainMatch ? domainMatch[1] : ''
        results.push({ name, domain, tagline: tagline || '' })
      }
    })

    return results.slice(0, 15)
  } catch {
    return []
  }
}

// --- Y Combinator directory search ---

export async function searchYCDirectory(
  query: string
): Promise<{ name: string; domain: string; description: string }[]> {
  try {
    const url = `https://www.ycombinator.com/companies?q=${encodeURIComponent(query)}`
    const html = await fetchHtml(url)
    if (!html) return []

    const $ = cheerio.load(html)
    const results: { name: string; domain: string; description: string }[] = []

    // YC directory uses company cards
    $('[class*="CompanyCard"], [class*="_company_"], a[href^="/companies/"]').each((_, el) => {
      const anchor = $(el).is('a') ? $(el) : $(el).find('a[href^="/companies/"]').first()
      const name = $(el).find('[class*="coName"], [class*="company-name"], h4, h3').first().text().trim() ||
        anchor.find('span, h4').first().text().trim()
      const description = $(el).find('[class*="coDescription"], [class*="description"], p').first().text().trim()
      const websiteLink = $(el).find('a[href^="http"]').not('a[href*="ycombinator"]').first().attr('href') || ''

      if (name) {
        const domainMatch = websiteLink.match(/https?:\/\/([^/?#]+)/)
        const domain = domainMatch ? domainMatch[1] : ''
        results.push({ name, domain, description: description || '' })
      }
    })

    return results.slice(0, 15)
  } catch {
    return []
  }
}

// --- Helper: extract domain from URL ---

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : 'https://' + url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

// --- Helper: deduplicate by domain ---

function deduplicateByDomain(
  items: { domain: string; name: string; snippet: string; source: string }[]
): { domain: string; name: string; snippet: string; source: string }[] {
  const seen = new Set<string>()
  const result: typeof items = []
  for (const item of items) {
    const d = item.domain.toLowerCase()
    if (!d || seen.has(d)) continue
    // Skip known non-company domains
    if (/google\.|facebook\.|twitter\.|linkedin\.|youtube\.|wikipedia\.|reddit\.|github\./.test(d)) continue
    seen.add(d)
    result.push(item)
  }
  return result
}

// --- AI scoring ---

async function scoreCompaniesAgainstICP(
  companies: { domain: string; name: string; snippet: string; source: string }[],
  icpDescription: string
): Promise<DiscoveredCompany[]> {
  if (companies.length === 0) return []

  const companySummary = companies
    .map((c, i) => `${i + 1}. ${c.name} (${c.domain}) — ${c.snippet || 'No description'}`)
    .join('\n')

  const prompt = `You are an expert ICP matcher. Given the following Ideal Customer Profile (ICP) criteria and a list of discovered companies, score each company on how well it matches the ICP.

ICP CRITERIA:
${icpDescription}

DISCOVERED COMPANIES:
${companySummary}

For each company, provide:
- matchScore: 0-100 (how well it fits the ICP)
- matchReasons: 1-3 short reasons explaining the score

Respond with a JSON object:
{
  "scores": [
    { "index": 1, "matchScore": 85, "matchReasons": ["Reason 1", "Reason 2"] }
  ]
}

RULES:
- Score based on available information only
- If snippet provides little info, score conservatively (30-50 range)
- Be honest — don't inflate scores
- Return ONLY valid JSON`

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an ICP matching expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as { scores: { index: number; matchScore: number; matchReasons: string[] }[] }

    const scoreMap = new Map<number, { matchScore: number; matchReasons: string[] }>()
    for (const s of parsed.scores || []) {
      scoreMap.set(s.index, { matchScore: s.matchScore, matchReasons: s.matchReasons })
    }

    return companies.map((c, i) => {
      const score = scoreMap.get(i + 1)
      return {
        domain: c.domain,
        name: c.name,
        snippet: c.snippet,
        source: c.source,
        matchScore: score?.matchScore ?? 40,
        matchReasons: score?.matchReasons ?? ['Limited information available'],
      }
    })
  } catch {
    // If scoring fails, return with default scores
    return companies.map((c) => ({
      domain: c.domain,
      name: c.name,
      snippet: c.snippet,
      source: c.source,
      matchScore: 40,
      matchReasons: ['Scoring unavailable'],
    }))
  }
}

async function scoreSimilarity(
  companies: { domain: string; name: string; snippet: string; source: string }[],
  referenceDescription: string
): Promise<DiscoveredCompany[]> {
  if (companies.length === 0) return []

  const companySummary = companies
    .map((c, i) => `${i + 1}. ${c.name} (${c.domain}) — ${c.snippet || 'No description'}`)
    .join('\n')

  const prompt = `You are an expert at finding similar companies. Given a reference company description and a list of discovered companies, score how similar each company is to the reference.

REFERENCE COMPANY:
${referenceDescription}

DISCOVERED COMPANIES:
${companySummary}

For each company, provide:
- matchScore: 0-100 (similarity to the reference company)
- matchReasons: 1-3 short reasons explaining why it's similar or different

Respond with a JSON object:
{
  "scores": [
    { "index": 1, "matchScore": 75, "matchReasons": ["Similar industry", "Same target market"] }
  ]
}

RULES:
- Focus on business model, target market, industry, and product similarity
- Direct competitors should score 70-90
- Same-industry/different-segment should score 40-70
- If snippet gives little info, score conservatively (30-50)
- Return ONLY valid JSON`

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a company similarity expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as { scores: { index: number; matchScore: number; matchReasons: string[] }[] }

    const scoreMap = new Map<number, { matchScore: number; matchReasons: string[] }>()
    for (const s of parsed.scores || []) {
      scoreMap.set(s.index, { matchScore: s.matchScore, matchReasons: s.matchReasons })
    }

    return companies.map((c, i) => {
      const score = scoreMap.get(i + 1)
      return {
        domain: c.domain,
        name: c.name,
        snippet: c.snippet,
        source: c.source,
        matchScore: score?.matchScore ?? 40,
        matchReasons: score?.matchReasons ?? ['Limited information available'],
      }
    })
  } catch {
    return companies.map((c) => ({
      domain: c.domain,
      name: c.name,
      snippet: c.snippet,
      source: c.source,
      matchScore: 40,
      matchReasons: ['Scoring unavailable'],
    }))
  }
}

// --- Enrich top results with homepage scrape + AI mini-brief ---

async function enrichTopCompanies(
  companies: DiscoveredCompany[],
  count: number,
  onProgress?: (message: string) => Promise<void> | void
): Promise<DiscoveredCompany[]> {
  const toEnrich = companies.slice(0, count)
  const rest = companies.slice(count)

  await onProgress?.(`Enriching top ${toEnrich.length} companies with detailed data...`)

  const enriched = await Promise.all(
    toEnrich.map(async (company) => {
      try {
        const html = await fetchHtml(`https://${company.domain}`)
        if (!html) return company

        const $ = cheerio.load(html)
        $('script, style, nav, footer, iframe, noscript, svg').remove()

        const title = $('title').text().trim()
        const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || ''
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000)

        // Extract structured data for additional context
        const structuredData = extractStructuredData(html)
        const orgData = structuredData.find((s) => s.type === 'Organization' || s.type === 'Corporation')

        return {
          ...company,
          name: title?.split(/[|\-–—]/)?.[0]?.trim() || company.name,
          description: metaDesc || bodyText.slice(0, 300),
          industry: orgData?.raw?.industry as string || undefined,
          estimatedSize: orgData?.raw?.numberOfEmployees
            ? JSON.stringify(orgData.raw.numberOfEmployees)
            : undefined,
        }
      } catch {
        return company
      }
    })
  )

  // Now use AI to generate whyRelevant for all enriched companies
  const enrichedSummary = enriched
    .map((c, i) => `${i + 1}. ${c.name} (${c.domain}) — ${c.description || c.snippet || 'No description'}`)
    .join('\n')

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate concise, actionable business summaries. Always respond with valid JSON only.' },
        {
          role: 'user',
          content: `For each company below, provide a 2-sentence "why relevant" summary explaining what makes them interesting as a business prospect and what their core value proposition is. Also infer their industry and key products if not already known.

COMPANIES:
${enrichedSummary}

Respond with JSON:
{
  "companies": [
    {
      "index": 1,
      "whyRelevant": "2 sentence actionable summary",
      "industry": "specific industry",
      "keyProducts": ["product1", "product2"]
    }
  ]
}`,
        },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as {
      companies: { index: number; whyRelevant: string; industry: string; keyProducts: string[] }[]
    }

    const aiMap = new Map<number, typeof parsed.companies[0]>()
    for (const c of parsed.companies || []) {
      aiMap.set(c.index, c)
    }

    for (let i = 0; i < enriched.length; i++) {
      const ai = aiMap.get(i + 1)
      if (ai) {
        enriched[i].whyRelevant = ai.whyRelevant
        if (!enriched[i].industry) enriched[i].industry = ai.industry
        enriched[i].keyProducts = ai.keyProducts
      }
    }
  } catch {
    // enrichment failed, continue with what we have
  }

  return [...enriched, ...rest]
}

// --- Main discovery functions ---

export async function discoverByICP(
  icp: ICP,
  onProgress?: (message: string) => Promise<void> | void
): Promise<DiscoveredCompany[]> {
  await onProgress?.('Building search queries from ICP...')

  // Build 2-3 varied search queries from the ICP
  const queries: string[] = []

  const industryPart = icp.industries.length > 0 ? icp.industries.join(' OR ') : ''
  const keywordPart = icp.keywords.length > 0 ? icp.keywords.join(' ') : ''
  const techPart = icp.techStack.length > 0 ? icp.techStack.slice(0, 2).join(' ') : ''
  const geo = icp.geography
  const geoPart = geo && hasGeoSelections(geo) ? geoTargetToQueryString(geo) : ''
  const sizePart = icp.sizeRange ? `${icp.sizeRange} employees` : ''
  const fundingPart = icp.fundingStage || ''

  // Query 1: Industry + keywords + geo
  if (industryPart || keywordPart) {
    queries.push(`${industryPart} ${keywordPart} companies ${geoPart}`.trim())
  }

  // Query 2: Tech-focused
  if (techPart) {
    queries.push(`${techPart} ${industryPart} startups ${fundingPart}`.trim())
  }

  // Query 3: Size + funding focused
  if (sizePart || fundingPart) {
    queries.push(`${industryPart} ${fundingPart} ${sizePart} ${keywordPart}`.trim())
  }

  // Ensure at least one query
  if (queries.length === 0) {
    queries.push(`${icp.keywords.join(' ')} companies`)
  }

  await onProgress?.(`Searching with ${queries.length} queries...`)

  // Run searches in parallel
  const allRaw: { domain: string; name: string; snippet: string; source: string }[] = []

  const searchPromises = queries.map(async (q) => {
    const results = await searchGoogle(q)
    return results.map((r) => ({
      domain: extractDomain(r.link),
      name: r.title,
      snippet: r.snippet,
      source: 'google',
    }))
  })

  const searchResults = await Promise.all(searchPromises)
  for (const batch of searchResults) {
    allRaw.push(...batch)
  }

  // Also try Product Hunt if we have keywords
  if (icp.keywords.length > 0) {
    const phResults = await searchProductHunt(icp.keywords.slice(0, 3).join(' '))
    for (const r of phResults) {
      if (r.domain) {
        allRaw.push({ domain: r.domain, name: r.name, snippet: r.tagline, source: 'producthunt' })
      }
    }
  }

  const deduped = deduplicateByDomain(allRaw)
  await onProgress?.(`Found ${deduped.length} unique companies, scoring against ICP...`)

  // Build ICP description for scoring
  const icpDescription = [
    icp.industries.length > 0 ? `Industries: ${icp.industries.join(', ')}` : '',
    icp.sizeRange ? `Company size: ${icp.sizeRange}` : '',
    icp.techStack.length > 0 ? `Tech stack: ${icp.techStack.join(', ')}` : '',
    icp.keywords.length > 0 ? `Keywords: ${icp.keywords.join(', ')}` : '',
    geo && hasGeoSelections(geo) ? `Geography: ${geoTargetToLabel(geo)}` : '',
    icp.fundingStage ? `Funding stage: ${icp.fundingStage}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Score in batches of 20
  const scored: DiscoveredCompany[] = []
  for (let i = 0; i < deduped.length; i += 20) {
    const batch = deduped.slice(i, i + 20)
    const batchScored = await scoreCompaniesAgainstICP(batch, icpDescription)
    scored.push(...batchScored)
  }

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore)

  const top = scored.slice(0, 20)
  return enrichTopCompanies(top, Math.min(10, top.length), onProgress)
}

export async function discoverLookalike(
  referenceDomain: string,
  onProgress?: (message: string) => Promise<void> | void,
  geography?: GeoTarget
): Promise<DiscoveredCompany[]> {
  await onProgress?.('Researching reference company...')

  // Scrape the reference company
  const scrapedData = await scrapeCompany(referenceDomain)

  await onProgress?.('Extracting key attributes...')

  // Use AI to extract key attributes for search
  const refText = scrapedData.rawTexts.slice(0, 4000)
  const companyName = scrapedData.homepage?.title?.split(/[|\-–—]/)?.[0]?.trim() || referenceDomain.split('.')[0]

  let attributes: { industry: string; businessModel: string; targetMarket: string; techFocus: string; description: string }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You extract company attributes. Always respond with valid JSON only.' },
        {
          role: 'user',
          content: `Analyze this company data and extract key attributes.

COMPANY: ${referenceDomain}
DATA:
${refText || 'No data available. Infer from domain name.'}

Respond with JSON:
{
  "industry": "primary industry",
  "businessModel": "e.g., SaaS, marketplace, agency, etc.",
  "targetMarket": "who they sell to",
  "techFocus": "their technology focus area",
  "description": "1-2 sentence summary"
}`,
        },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    attributes = JSON.parse(text)
  } catch {
    attributes = {
      industry: 'technology',
      businessModel: 'unknown',
      targetMarket: 'businesses',
      techFocus: 'software',
      description: `Company at ${referenceDomain}`,
    }
  }

  await onProgress?.('Searching for similar companies...')

  // Build search queries
  const geoSuffix = geography && hasGeoSelections(geography) ? ` ${geoTargetToQueryString(geography)}` : ''
  const queries = [
    `companies similar to ${companyName}${geoSuffix}`,
    `${attributes.industry} ${attributes.businessModel} companies${geoSuffix}`,
    `competitors of ${companyName}${geoSuffix}`,
    `${attributes.industry} ${attributes.targetMarket} startups${geoSuffix}`,
    `alternatives to ${companyName}${geoSuffix}`,
  ]

  const allRaw: { domain: string; name: string; snippet: string; source: string }[] = []

  // Run Google searches in parallel
  const googlePromises = queries.map(async (q) => {
    const results = await searchGoogle(q)
    return results.map((r) => ({
      domain: extractDomain(r.link),
      name: r.title,
      snippet: r.snippet,
      source: 'google',
    }))
  })

  const googleResults = await Promise.all(googlePromises)
  for (const batch of googleResults) {
    allRaw.push(...batch)
  }

  // Also search YC directory
  const ycResults = await searchYCDirectory(attributes.industry)
  for (const r of ycResults) {
    if (r.domain) {
      allRaw.push({ domain: r.domain, name: r.name, snippet: r.description, source: 'yc' })
    }
  }

  // Deduplicate and remove the reference company
  const refDomain = extractDomain(referenceDomain)
  const deduped = deduplicateByDomain(allRaw).filter(
    (c) => c.domain.toLowerCase() !== refDomain.toLowerCase()
  )

  await onProgress?.(`Found ${deduped.length} candidates, scoring similarity...`)

  // Build reference description for similarity scoring
  const geoContext = geography && hasGeoSelections(geography) ? ` Target geography: ${geoTargetToLabel(geography)}.` : ''
  const referenceDescription = `${companyName} (${referenceDomain}): ${attributes.description}. Industry: ${attributes.industry}. Business model: ${attributes.businessModel}. Target market: ${attributes.targetMarket}. Tech focus: ${attributes.techFocus}.${geoContext}`

  // Score in batches of 20
  const scored: DiscoveredCompany[] = []
  for (let i = 0; i < deduped.length; i += 20) {
    const batch = deduped.slice(i, i + 20)
    const batchScored = await scoreSimilarity(batch, referenceDescription)
    scored.push(...batchScored)
  }

  scored.sort((a, b) => b.matchScore - a.matchScore)

  const top = scored.slice(0, 20)
  return enrichTopCompanies(top, Math.min(10, top.length), onProgress)
}

export async function discoverByKeywords(
  keywords: string[],
  filters?: Partial<ICP>,
  onProgress?: (message: string) => Promise<void> | void
): Promise<DiscoveredCompany[]> {
  await onProgress?.('Searching by keywords...')

  const query = keywords.join(' ') + ' companies'
  const results = await searchGoogle(query)

  const allRaw = results.map((r) => ({
    domain: extractDomain(r.link),
    name: r.title,
    snippet: r.snippet,
    source: 'google' as const,
  }))

  const deduped = deduplicateByDomain(allRaw)

  await onProgress?.(`Found ${deduped.length} unique companies, scoring...`)

  // Build a scoring description from keywords + filters
  const parts = [`Keywords: ${keywords.join(', ')}`]
  if (filters) {
    if (filters.industries?.length) parts.push(`Industries: ${filters.industries.join(', ')}`)
    if (filters.sizeRange) parts.push(`Size: ${filters.sizeRange}`)
    if (filters.techStack?.length) parts.push(`Tech: ${filters.techStack.join(', ')}`)
    if (filters.geography && hasGeoSelections(filters.geography)) parts.push(`Geography: ${geoTargetToLabel(filters.geography)}`)
    if (filters.fundingStage) parts.push(`Funding: ${filters.fundingStage}`)
  }

  const icpDescription = parts.join('\n')

  const scored = await scoreCompaniesAgainstICP(deduped.slice(0, 30), icpDescription)
  scored.sort((a, b) => b.matchScore - a.matchScore)

  return scored.slice(0, 20)
}
