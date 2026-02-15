import * as cheerio from 'cheerio'
import { firecrawlScrape } from './firecrawl.js'
import dns from 'node:dns/promises'
import { URL } from 'node:url'
import { sanitizeForAI } from './sanitize.js'

export function isPrivateIP(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  // Block well-known private hostnames
  if (lower === 'localhost' || lower === '0.0.0.0') return true

  // AWS metadata endpoint
  if (lower === '169.254.169.254') return true

  // IPv6 private/loopback
  if (lower === '::1' || lower === '[::1]') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7
  if (lower.startsWith('fe80')) return true // fe80::/10

  // IPv4 private ranges
  if (hostname.startsWith('127.')) return true
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('0.')) return true
  if (hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('169.254.')) return true

  // 172.16.0.0/12 = 172.16.x.x through 172.31.x.x
  if (hostname.startsWith('172.')) {
    const secondOctet = parseInt(hostname.split('.')[1], 10)
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }

  return false
}

export async function validateUrl(url: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }

  const hostname = parsed.hostname

  // Check hostname directly
  if (isPrivateIP(hostname)) return false

  // DNS resolution check
  try {
    const addresses = await dns.resolve4(hostname)
    for (const addr of addresses) {
      if (isPrivateIP(addr)) return false
    }
  } catch {
    // DNS resolution failed — could be IPv6-only or unreachable, allow to proceed
    // but try IPv6 too
  }

  try {
    const addresses = await dns.resolve6(hostname)
    for (const addr of addresses) {
      if (isPrivateIP(addr)) return false
    }
  } catch {
    // No IPv6 records, that's fine
  }

  return true
}

export interface ScrapedPage {
  url: string
  title: string
  text: string
  markdown?: string
  links: string[]
  meta: Record<string, string>
}

export interface NewsItem {
  title: string
  link: string
  date: string
  source: string
}

export interface TeamMember {
  name: string
  role: string
}

export interface StructuredData {
  type: string
  name?: string
  description?: string
  raw: Record<string, unknown>
}

export interface PricingTier {
  name: string
  price: string | null
  billingPeriod: string | null
  features: string[]
  isPopular: boolean
  isFree: boolean
  isEnterprise: boolean
}

export interface PricingData {
  tiers: PricingTier[]
  hasFreePlan: boolean
  hasEnterprisePlan: boolean
  lowestPaidPrice: string | null
  pricingModel: 'freemium' | 'trial' | 'paid-only' | 'enterprise-only' | 'open-source' | 'unknown'
}

export interface TeamMemberDetailed {
  name: string
  role: string
  level: 'c-suite' | 'vp' | 'director' | 'manager' | 'individual'
  department: string | null
  linkedinUrl: string | null
  photoUrl: string | null
}

export interface ScrapedPageMeta {
  url: string
  fetchedAt: string
  category: string
  charCount: number
  success: boolean
}

export interface ScrapedCompanyData {
  homepage: ScrapedPage | null
  about: ScrapedPage | null
  careers: ScrapedPage | null
  pricing: ScrapedPage | null
  blog: ScrapedPage | null
  jobListings: string[]
  newsItems: NewsItem[]
  detectedTech: string[]
  teamMembers: TeamMember[]
  structuredData: StructuredData[]
  rawTexts: string
  pricingData: PricingData | null
  teamDetailed: TeamMemberDetailed[]
  pagesScraped: number
  sitemapDiscovered: boolean
  categories: Record<string, string>
  pageMeta: ScrapedPageMeta[]
}

export interface ScrapeDetailEvent {
  url: string
  status: 'fetching' | 'success' | 'failed'
  pageType: string
}

interface PageToScrape {
  path: string
  category: string
}

const PAGES_TO_SCRAPE: PageToScrape[] = [
  // Core
  { path: '/', category: 'homepage' },
  { path: '/about', category: 'about' },
  { path: '/about-us', category: 'about' },
  { path: '/careers', category: 'careers' },
  { path: '/jobs', category: 'careers' },
  { path: '/pricing', category: 'pricing' },
  { path: '/blog', category: 'blog' },
  // Product
  { path: '/products', category: 'product' },
  { path: '/features', category: 'product' },
  { path: '/solutions', category: 'product' },
  { path: '/platform', category: 'product' },
  // Team
  { path: '/team', category: 'team' },
  { path: '/leadership', category: 'team' },
  { path: '/people', category: 'team' },
  // Press
  { path: '/press', category: 'press' },
  { path: '/newsroom', category: 'press' },
  { path: '/news', category: 'press' },
  // Partners
  { path: '/partners', category: 'partners' },
  { path: '/integrations', category: 'partners' },
  { path: '/ecosystem', category: 'partners' },
  // Social proof
  { path: '/customers', category: 'customers' },
  { path: '/case-studies', category: 'customers' },
  { path: '/testimonials', category: 'customers' },
  // Developer
  { path: '/docs', category: 'developer' },
  { path: '/developers', category: 'developer' },
  { path: '/api', category: 'developer' },
  // Product velocity
  { path: '/changelog', category: 'changelog' },
  { path: '/updates', category: 'changelog' },
  { path: '/releases', category: 'changelog' },
  // Enterprise
  { path: '/security', category: 'enterprise' },
  { path: '/compliance', category: 'enterprise' },
  { path: '/trust', category: 'enterprise' },
  // Sales
  { path: '/contact', category: 'sales' },
  { path: '/demo', category: 'sales' },
  { path: '/get-started', category: 'sales' },
]

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string | null> {
  try {
    const allowed = await validateUrl(url)
    if (!allowed) throw new Error('URL blocked: private/internal addresses not allowed')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
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

async function fetchPageEnhanced(url: string): Promise<{
  html: string | null
  markdown: string | null
  metadata: Record<string, string>
}> {
  const allowed = await validateUrl(url)
  if (!allowed) throw new Error('URL blocked: private/internal addresses not allowed')

  // Try Firecrawl first — better content extraction, handles JS-rendered pages
  const fcResult = await firecrawlScrape(url)
  if (fcResult && (fcResult.markdown || fcResult.html)) {
    return {
      html: fcResult.html || null,
      markdown: fcResult.markdown || null,
      metadata: fcResult.metadata,
    }
  }

  // Fallback to direct fetch
  const html = await fetchPage(url)
  return { html, markdown: null, metadata: {} }
}

function extractPage(html: string, url: string): ScrapedPage {
  const $ = cheerio.load(html)

  // Remove noise
  $('script, style, nav, footer, iframe, noscript, svg').remove()

  const title = $('title').text().trim()

  const meta: Record<string, string> = {}
  $('meta[name], meta[property]').each((_, el) => {
    const key = $(el).attr('name') || $(el).attr('property') || ''
    const content = $(el).attr('content') || ''
    if (key && content) meta[key] = content
  })

  const rawText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25000)

  const text = sanitizeForAI(rawText)

  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) links.push(href)
  })

  return { url, title: sanitizeForAI(title), text, links, meta }
}

function extractJobListings($: cheerio.CheerioAPI): string[] {
  const jobs: string[] = []
  const jobSelectors = [
    'h2, h3, h4',
    '[class*="job"], [class*="position"], [class*="role"], [class*="opening"]',
    'li a',
  ]

  for (const selector of jobSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim()
      if (
        text.length > 5 &&
        text.length < 200 &&
        (text.match(
          /engineer|developer|designer|manager|analyst|lead|director|specialist|coordinator|sales|marketing|product|data|devops|sre|qa|frontend|backend|fullstack|full-stack/i
        ) ||
          $(el).closest('[class*="job"], [class*="position"], [class*="career"], [class*="opening"]').length > 0)
      ) {
        jobs.push(text)
      }
    })
  }

  return [...new Set(jobs)].slice(0, 30)
}

function normalizeUrl(domain: string): string {
  let url = domain.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  return url.replace(/\/$/, '')
}

export async function scrapeNews(companyName: string, _domain: string): Promise<NewsItem[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(companyName)}&hl=en-US&gl=US&ceid=US:en`
    const html = await fetchPage(rssUrl)
    if (!html) return []

    const $ = cheerio.load(html, { xmlMode: true })
    const items: NewsItem[] = []

    $('item').each((_, el) => {
      if (items.length >= 10) return false
      const title = $(el).find('title').text().trim()
      const link = $(el).find('link').text().trim()
      const pubDate = $(el).find('pubDate').text().trim()
      const source = $(el).find('source').text().trim()

      if (title) {
        items.push({
          title,
          link,
          date: pubDate,
          source: source || 'Unknown',
        })
      }
    })

    return items
  } catch {
    return []
  }
}

export function detectTechStack(html: string): string[] {
  const techs = new Set<string>()

  const scriptPatterns: [RegExp, string][] = [
    [/react/i, 'React'],
    [/vue/i, 'Vue.js'],
    [/angular/i, 'Angular'],
    [/jquery/i, 'jQuery'],
    [/next/i, 'Next.js'],
    [/nuxt/i, 'Nuxt.js'],
    [/svelte/i, 'Svelte'],
    [/googletagmanager|gtm\.js/i, 'Google Tag Manager'],
    [/google-analytics|gtag/i, 'Google Analytics'],
    [/segment\.com|analytics\.js/i, 'Segment'],
    [/intercom/i, 'Intercom'],
    [/drift/i, 'Drift'],
    [/hubspot/i, 'HubSpot'],
    [/zendesk/i, 'Zendesk'],
    [/salesforce|pardot/i, 'Salesforce'],
    [/stripe/i, 'Stripe'],
    [/cloudflare/i, 'Cloudflare'],
    [/hotjar/i, 'Hotjar'],
    [/mixpanel/i, 'Mixpanel'],
    [/amplitude/i, 'Amplitude'],
    [/sentry/i, 'Sentry'],
    [/datadog/i, 'Datadog'],
    [/optimizely/i, 'Optimizely'],
    [/typeform/i, 'Typeform'],
    [/calendly/i, 'Calendly'],
    [/crisp/i, 'Crisp'],
    [/freshdesk|freshchat/i, 'Freshworks'],
    [/shopify/i, 'Shopify'],
    [/wp-content|wp-includes|wordpress/i, 'WordPress'],
  ]

  const metaGenerators: [RegExp, string][] = [
    [/wordpress/i, 'WordPress'],
    [/webflow/i, 'Webflow'],
    [/squarespace/i, 'Squarespace'],
    [/shopify/i, 'Shopify'],
    [/wix/i, 'Wix'],
    [/ghost/i, 'Ghost'],
    [/drupal/i, 'Drupal'],
    [/joomla/i, 'Joomla'],
    [/hugo/i, 'Hugo'],
    [/gatsby/i, 'Gatsby'],
  ]

  const cssPatterns: [RegExp, string][] = [
    [/tailwind/i, 'Tailwind CSS'],
    [/bootstrap/i, 'Bootstrap'],
    [/material/i, 'Material UI'],
    [/chakra/i, 'Chakra UI'],
    [/bulma/i, 'Bulma'],
    [/foundation/i, 'Foundation'],
  ]

  const $ = cheerio.load(html)

  // Check script sources
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || ''
    for (const [pattern, name] of scriptPatterns) {
      if (pattern.test(src)) techs.add(name)
    }
  })

  // Check inline scripts
  const inlineScripts = $('script:not([src])').text()
  for (const [pattern, name] of scriptPatterns) {
    if (pattern.test(inlineScripts)) techs.add(name)
  }

  // Check meta generators
  const generator = $('meta[name="generator"]').attr('content') || ''
  for (const [pattern, name] of metaGenerators) {
    if (pattern.test(generator)) techs.add(name)
  }

  // Check link hrefs for CDN patterns
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    for (const [pattern, name] of scriptPatterns) {
      if (pattern.test(href)) techs.add(name)
    }
  })

  // Check class names for CSS framework patterns
  const bodyHtml = $('body').html() || ''
  for (const [pattern, name] of cssPatterns) {
    if (pattern.test(bodyHtml)) techs.add(name)
  }

  return [...techs]
}

export function extractStructuredData(html: string): StructuredData[] {
  const $ = cheerio.load(html)
  const results: StructuredData[] = []

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '{}')
      const items = Array.isArray(raw) ? raw : [raw]
      for (const item of items) {
        if (item['@type']) {
          results.push({
            type: item['@type'],
            name: item.name || item.headline || undefined,
            description: item.description || undefined,
            raw: item,
          })
        }
      }
    } catch {
      // skip malformed JSON-LD
    }
  })

  return results
}

export function extractTeamMembers($: cheerio.CheerioAPI): TeamMember[] {
  const members: TeamMember[] = []
  const seen = new Set<string>()

  // Pattern 1: Cards with name in heading and role in paragraph/span
  $('[class*="team"], [class*="people"], [class*="staff"], [class*="leader"], [class*="member"]').each((_, container) => {
    $(container).find('h2, h3, h4, h5').each((_, nameEl) => {
      const name = $(nameEl).text().trim()
      if (name.length < 3 || name.length > 80) return
      // Look for role in next sibling or nearby p/span
      const roleEl = $(nameEl).next('p, span, [class*="title"], [class*="role"], [class*="position"]')
      const role = roleEl.text().trim()
      if (role && role.length < 100 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        members.push({ name, role })
      }
    })
  })

  // Pattern 2: Definition-list style (dt/dd)
  $('dl').each((_, dl) => {
    $(dl).find('dt').each((_, dt) => {
      const name = $(dt).text().trim()
      const dd = $(dt).next('dd')
      const role = dd.text().trim()
      if (name.length > 2 && name.length < 80 && role && role.length < 100 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        members.push({ name, role })
      }
    })
  })

  // Pattern 3: Simple name/title pairs in list items
  if (members.length === 0) {
    $('li').each((_, li) => {
      const strong = $(li).find('strong, b').first().text().trim()
      const fullText = $(li).text().trim()
      if (strong && strong.length > 2 && strong.length < 80) {
        const role = fullText.replace(strong, '').replace(/^[\s,\-–—:]+/, '').trim()
        if (role && role.length < 100 && !seen.has(strong.toLowerCase())) {
          // Basic check: does the name look like a person name (at least 2 parts)?
          if (strong.split(/\s+/).length >= 2) {
            seen.add(strong.toLowerCase())
            members.push({ name: strong, role })
          }
        }
      }
    })
  }

  return members.slice(0, 20)
}

export async function parseSitemap(domain: string): Promise<string[]> {
  try {
    const url = `https://${domain}/sitemap.xml`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return []
    const xml = await response.text()
    const $ = cheerio.load(xml, { xmlMode: true })
    const urls: string[] = []
    $('url loc').each((_, el) => {
      urls.push($(el).text())
    })
    return urls.slice(0, 100)
  } catch {
    return []
  }
}

function classifyLevel(role: string): TeamMemberDetailed['level'] {
  const lower = role.toLowerCase()
  if (/\b(ceo|cto|cfo|coo|cmo|cpo|cro|chief|co-founder|founder)\b/.test(lower)) return 'c-suite'
  if (/\b(vp|vice\s+president|svp|evp)\b/.test(lower)) return 'vp'
  if (/\bdirector\b/.test(lower)) return 'director'
  if (/\b(manager|head\s+of|lead)\b/.test(lower)) return 'manager'
  return 'individual'
}

function guessDepartment(role: string): string | null {
  const lower = role.toLowerCase()
  if (/engineer|develop|software|platform|infra|sre|devops|backend|frontend|fullstack|full-stack/.test(lower)) return 'Engineering'
  if (/design|ux|ui|creative/.test(lower)) return 'Design'
  if (/product\s+(manager|lead|director|vp)|pm\b|head\s+of\s+product|product\s+owner/.test(lower)) return 'Product'
  if (/market|growth|brand|content|seo|social/.test(lower)) return 'Marketing'
  if (/sale|account\s+exec|bdr|sdr|revenue/.test(lower)) return 'Sales'
  if (/people|hr|human\s+resource|talent|recruit/.test(lower)) return 'People'
  if (/financ|accounting|controller/.test(lower)) return 'Finance'
  if (/legal|compliance|counsel/.test(lower)) return 'Legal'
  if (/data|analytics|machine\s+learning|ai|ml\b/.test(lower)) return 'Data'
  if (/support|success|customer/.test(lower)) return 'Customer Success'
  if (/security|infosec/.test(lower)) return 'Security'
  if (/operation|ops\b/.test(lower)) return 'Operations'
  return null
}

export function extractTeamDetailed(html: string): TeamMemberDetailed[] {
  const $ = cheerio.load(html)
  const members: TeamMemberDetailed[] = []
  const seen = new Set<string>()

  $('[class*="team"], [class*="people"], [class*="staff"], [class*="leader"], [class*="member"], [class*="person"]').each((_, container) => {
    $(container).find('h2, h3, h4, h5').each((_, nameEl) => {
      const name = $(nameEl).text().trim()
      if (name.length < 3 || name.length > 80) return
      if (seen.has(name.toLowerCase())) return

      const roleEl = $(nameEl).next('p, span, [class*="title"], [class*="role"], [class*="position"]')
      const role = roleEl.text().trim()
      if (!role || role.length > 100) return

      seen.add(name.toLowerCase())

      const card = $(nameEl).closest('[class*="team"], [class*="person"], [class*="member"], [class*="card"]')
      const linkedinAnchor = card.find('a[href*="linkedin.com"]')
      const linkedinUrl = linkedinAnchor.attr('href') || null
      const img = card.find('img')
      const photoUrl = img.attr('src') || null

      members.push({
        name,
        role,
        level: classifyLevel(role),
        department: guessDepartment(role),
        linkedinUrl,
        photoUrl,
      })
    })
  })

  if (members.length === 0) {
    $('li').each((_, li) => {
      const strong = $(li).find('strong, b, h3, h4').first().text().trim()
      const fullText = $(li).text().trim()
      if (strong && strong.length > 2 && strong.length < 80 && strong.split(/\s+/).length >= 2) {
        const role = fullText.replace(strong, '').replace(/^[\s,\-–—:]+/, '').trim()
        if (role && role.length < 100 && !seen.has(strong.toLowerCase())) {
          seen.add(strong.toLowerCase())
          const linkedinAnchor = $(li).find('a[href*="linkedin.com"]')
          members.push({
            name: strong,
            role,
            level: classifyLevel(role),
            department: guessDepartment(role),
            linkedinUrl: linkedinAnchor.attr('href') || null,
            photoUrl: $(li).find('img').attr('src') || null,
          })
        }
      }
    })
  }

  return members.slice(0, 50)
}

export function extractPricingData(html: string): PricingData {
  const $ = cheerio.load(html)
  const tiers: PricingTier[] = []

  const cardSelectors = [
    '[class*="pricing"] [class*="card"], [class*="pricing"] [class*="plan"], [class*="pricing"] [class*="tier"], [class*="pricing"] [class*="column"]',
    '[class*="plan"] [class*="card"], [class*="price"] [class*="card"]',
    '[class*="pricing-table"] > div, [class*="pricing-grid"] > div',
  ]

  for (const selector of cardSelectors) {
    $(selector).each((_, card) => {
      const cardText = $(card).text()
      const nameEl = $(card).find('h2, h3, h4, [class*="name"], [class*="title"]').first()
      const name = nameEl.text().trim()
      if (!name || name.length > 60) return

      const priceMatch = cardText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year|user|seat))?/i)
        || cardText.match(/(?:free|custom|contact\s+(?:us|sales)|enterprise)/i)
      const price = priceMatch ? priceMatch[0].trim() : null

      let billingPeriod: string | null = null
      if (cardText.match(/\/\s*(?:mo|month)/i) || cardText.match(/monthly/i)) billingPeriod = 'monthly'
      else if (cardText.match(/\/\s*(?:yr|year)/i) || cardText.match(/annual|yearly/i)) billingPeriod = 'yearly'
      else if (cardText.match(/custom|contact/i)) billingPeriod = 'custom'

      const features: string[] = []
      $(card).find('li, [class*="feature"]').each((_, feat) => {
        const ft = $(feat).text().trim()
        if (ft.length > 3 && ft.length < 200) features.push(ft)
      })

      const isFree = /free/i.test(price || '') || /free/i.test(name)
      const isEnterprise = /enterprise|custom|contact/i.test(price || '') || /enterprise/i.test(name)
      const isPopular = $(card).find('[class*="popular"], [class*="recommended"], [class*="best"]').length > 0
        || $(card).is('[class*="popular"], [class*="recommended"], [class*="featured"]')

      if (price || features.length > 0) {
        tiers.push({ name, price, billingPeriod, features: features.slice(0, 20), isPopular, isFree, isEnterprise })
      }
    })
    if (tiers.length > 0) break
  }

  if (tiers.length === 0) {
    const table = $('table').first()
    if (table.length) {
      const headers: string[] = []
      table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((_, th) => {
        headers.push($(th).text().trim())
      })
      if (headers.length > 1) {
        for (let i = 1; i < headers.length; i++) {
          const name = headers[i]
          if (!name) continue
          const features: string[] = []
          table.find('tbody tr, tr:not(:first-child)').each((_, tr) => {
            const cells = $(tr).find('td, th')
            const label = cells.eq(0).text().trim()
            const val = cells.eq(i).text().trim()
            if (label && val) features.push(`${label}: ${val}`)
          })
          tiers.push({
            name,
            price: null,
            billingPeriod: null,
            features: features.slice(0, 20),
            isPopular: false,
            isFree: /free/i.test(name),
            isEnterprise: /enterprise/i.test(name),
          })
        }
      }
    }
  }

  const hasFreePlan = tiers.some(t => t.isFree)
  const hasEnterprisePlan = tiers.some(t => t.isEnterprise)

  let lowestPaidPrice: string | null = null
  const paidPrices = tiers
    .filter(t => t.price && !t.isFree && !t.isEnterprise)
    .map(t => t.price!)
    .filter(p => /\$\d/.test(p))
  if (paidPrices.length > 0) {
    const parsed = paidPrices.map(p => {
      const match = p.match(/\$([\d,]+(?:\.\d{2})?)/)
      return match ? { original: p, value: parseFloat(match[1].replace(/,/g, '')) } : null
    }).filter(Boolean) as { original: string; value: number }[]
    if (parsed.length > 0) {
      parsed.sort((a, b) => a.value - b.value)
      lowestPaidPrice = parsed[0].original
    }
  }

  let pricingModel: PricingData['pricingModel'] = 'unknown'
  const bodyText = $('body').text().toLowerCase()
  if (hasFreePlan && tiers.length > 1) pricingModel = 'freemium'
  else if (bodyText.includes('free trial') || bodyText.includes('try free') || bodyText.includes('start free')) pricingModel = 'trial'
  else if (hasEnterprisePlan && tiers.length === 1) pricingModel = 'enterprise-only'
  else if (bodyText.includes('open source') || bodyText.includes('open-source')) pricingModel = 'open-source'
  else if (tiers.length > 0) pricingModel = 'paid-only'

  return { tiers, hasFreePlan, hasEnterprisePlan, lowestPaidPrice, pricingModel }
}

export async function scrapeCompany(
  domain: string,
  onProgress?: (message: string) => void | Promise<void>,
  onScrapeDetail?: (event: ScrapeDetailEvent) => void | Promise<void>
): Promise<ScrapedCompanyData> {
  const baseUrl = normalizeUrl(domain)
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const result: ScrapedCompanyData = {
    homepage: null,
    about: null,
    careers: null,
    pricing: null,
    blog: null,
    jobListings: [],
    newsItems: [],
    detectedTech: [],
    teamMembers: [],
    structuredData: [],
    rawTexts: '',
    pricingData: null,
    teamDetailed: [],
    pagesScraped: 0,
    sitemapDiscovered: false,
    categories: {},
    pageMeta: [],
  }

  // Discover sitemap
  onProgress?.('Discovering pages...')
  const sitemapUrls = await parseSitemap(cleanDomain)
  result.sitemapDiscovered = sitemapUrls.length > 0

  // Build augmented page list: merge sitemap paths with default list
  const pathsToScrape = new Map<string, string>()
  for (const p of PAGES_TO_SCRAPE) {
    pathsToScrape.set(p.path, p.category)
  }
  for (const sitemapUrl of sitemapUrls) {
    try {
      const parsed = new URL(sitemapUrl)
      const path = parsed.pathname
      if (!pathsToScrape.has(path) && path !== '/') {
        const lower = path.toLowerCase()
        if (/pric|plan|package/.test(lower)) pathsToScrape.set(path, 'pricing')
        else if (/about|company|who-we/.test(lower)) pathsToScrape.set(path, 'about')
        else if (/career|job|hiring|join/.test(lower)) pathsToScrape.set(path, 'careers')
        else if (/team|people|leader|staff/.test(lower)) pathsToScrape.set(path, 'team')
        else if (/blog|article|post|insight/.test(lower)) pathsToScrape.set(path, 'blog')
        else if (/product|feature|solution|platform/.test(lower)) pathsToScrape.set(path, 'product')
        else if (/press|news|media/.test(lower)) pathsToScrape.set(path, 'press')
        else if (/partner|integrat|ecosystem/.test(lower)) pathsToScrape.set(path, 'partners')
        else if (/customer|case-stud|testimonial/.test(lower)) pathsToScrape.set(path, 'customers')
        else if (/doc|develop|api/.test(lower)) pathsToScrape.set(path, 'developer')
        else if (/changelog|update|release/.test(lower)) pathsToScrape.set(path, 'changelog')
        else if (/security|compliance|trust/.test(lower)) pathsToScrape.set(path, 'enterprise')
        else if (/contact|demo|get-started/.test(lower)) pathsToScrape.set(path, 'sales')
      }
    } catch {
      // skip malformed URLs
    }
  }

  const allPages = Array.from(pathsToScrape.entries()).map(([path, category]) => ({ path, category }))

  // Fetch in parallel batches of 5
  const categoryResults = new Map<string, { page: ScrapedPage; html?: string }>()

  for (let i = 0; i < allPages.length; i += 5) {
    const batch = allPages.slice(i, i + 5)
    const batchNum = Math.floor(i / 5) + 1
    const totalBatches = Math.ceil(allPages.length / 5)
    onProgress?.(`Scraping pages (batch ${batchNum}/${totalBatches})...`)

    const batchResults = await Promise.allSettled(
      batch.map(async ({ path, category }) => {
        const url = `${baseUrl}${path}`
        await onScrapeDetail?.({ url, status: 'fetching', pageType: category })
        try {
          const data = await fetchPageEnhanced(url)
          if (!data.html && !data.markdown) {
            await onScrapeDetail?.({ url, status: 'failed', pageType: category })
            result.pageMeta.push({ url, fetchedAt: new Date().toISOString(), category, charCount: 0, success: false })
            return null
          }

          let page: ScrapedPage
          if (data.html) {
            page = extractPage(data.html, url)
            if (data.markdown) page.markdown = sanitizeForAI(data.markdown)
          } else {
            page = {
              url,
              title: sanitizeForAI(data.metadata?.title || ''),
              text: sanitizeForAI(data.markdown?.slice(0, 25000) || ''),
              markdown: data.markdown ? sanitizeForAI(data.markdown) : undefined,
              links: [],
              meta: data.metadata || {},
            }
          }

          if (page.text.length < 100 && (!page.markdown || page.markdown.length < 100)) {
            await onScrapeDetail?.({ url, status: 'failed', pageType: category })
            result.pageMeta.push({ url, fetchedAt: new Date().toISOString(), category, charCount: page.text.length, success: false })
            return null
          }

          await onScrapeDetail?.({ url, status: 'success', pageType: category })
          result.pageMeta.push({ url, fetchedAt: new Date().toISOString(), category, charCount: page.text.length, success: true })
          return { category, page, html: data.html || undefined }
        } catch {
          await onScrapeDetail?.({ url, status: 'failed', pageType: category })
          result.pageMeta.push({ url, fetchedAt: new Date().toISOString(), category, charCount: 0, success: false })
          return null
        }
      })
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        const { category, page, html } = r.value
        const existing = categoryResults.get(category)
        const contentLen = (page.markdown || page.text).length
        const existingLen = existing ? (existing.page.markdown || existing.page.text).length : 0
        if (!existing || contentLen > existingLen) {
          categoryResults.set(category, { page, html })
        }
      }
    }
  }

  result.pagesScraped = result.pageMeta.filter(m => m.success).length

  // Map category results to legacy fields for backwards compatibility
  const hp = categoryResults.get('homepage')
  if (hp) {
    result.homepage = hp.page
    if (hp.html) {
      result.detectedTech = detectTechStack(hp.html)
      result.structuredData = extractStructuredData(hp.html)
    }
  }

  const aboutResult = categoryResults.get('about')
  if (aboutResult) {
    result.about = aboutResult.page
    if (aboutResult.html) {
      const $about = cheerio.load(aboutResult.html)
      result.teamMembers = extractTeamMembers($about)
    }
  }

  const careersResult = categoryResults.get('careers')
  if (careersResult) {
    result.careers = careersResult.page
    if (careersResult.html) {
      const $careers = cheerio.load(careersResult.html)
      result.jobListings = extractJobListings($careers)
    }
  }

  const pricingResult = categoryResults.get('pricing')
  if (pricingResult) {
    result.pricing = pricingResult.page
    if (pricingResult.html) {
      result.pricingData = extractPricingData(pricingResult.html)
    }
  }

  const blogResult = categoryResults.get('blog')
  if (blogResult) result.blog = blogResult.page

  // Extract team from team page if about page didn't yield results
  const teamResult = categoryResults.get('team')
  if (teamResult && result.teamMembers.length === 0) {
    if (teamResult.html) {
      const $team = cheerio.load(teamResult.html)
      result.teamMembers = extractTeamMembers($team)
    }
  }

  // Detailed team extraction
  if (teamResult?.html) {
    result.teamDetailed = extractTeamDetailed(teamResult.html)
  } else if (aboutResult?.html && result.teamDetailed.length === 0) {
    result.teamDetailed = extractTeamDetailed(aboutResult.html)
  }

  // Build categories map
  for (const [cat, { page }] of categoryResults) {
    result.categories[cat] = (page.markdown || page.text).slice(0, 25000)
  }

  // Scrape news
  const companyName = result.homepage?.title?.split(/[|\-–—]/)?.[0]?.trim() || domain.split('.')[0]
  onProgress?.('Searching for recent news...')
  result.newsItems = await scrapeNews(companyName, domain)

  // Compile raw texts for AI analysis
  const parts: string[] = []
  if (result.homepage) {
    const hpContent = result.homepage.markdown || result.homepage.text
    parts.push(`=== HOMEPAGE (${result.homepage.url}) ===\nTitle: ${result.homepage.title}\n${hpContent}`)
    if (Object.keys(result.homepage.meta).length > 0) {
      parts.push(`Meta: ${JSON.stringify(result.homepage.meta)}`)
    }
  }
  if (result.about) {
    const aboutContent = result.about.markdown || result.about.text
    parts.push(`\n=== ABOUT PAGE (${result.about.url}) ===\nTitle: ${result.about.title}\n${aboutContent}`)
  }
  if (result.careers) {
    const careersContent = result.careers.markdown || result.careers.text
    parts.push(`\n=== CAREERS PAGE (${result.careers.url}) ===\nTitle: ${result.careers.title}\n${careersContent}`)
  }
  if (result.pricing) {
    const pricingContent = result.pricing.markdown || result.pricing.text
    parts.push(`\n=== PRICING PAGE (${result.pricing.url}) ===\nTitle: ${result.pricing.title}\n${pricingContent}`)
  }
  if (result.blog) {
    const blogContent = result.blog.markdown || result.blog.text
    parts.push(`\n=== BLOG / RESOURCES (${result.blog.url}) ===\nTitle: ${result.blog.title}\n${blogContent.slice(0, 5000)}`)
  }

  // Include additional category pages in rawTexts
  const coreCategories = new Set(['homepage', 'about', 'careers', 'pricing', 'blog'])
  for (const [cat, content] of Object.entries(result.categories)) {
    if (!coreCategories.has(cat)) {
      parts.push(`\n=== ${cat.toUpperCase()} ===\n${content.slice(0, 5000)}`)
    }
  }

  if (result.jobListings.length > 0) {
    parts.push(`\n=== JOB LISTINGS ===\n${result.jobListings.join('\n')}`)
  }
  if (result.detectedTech.length > 0) {
    parts.push(`\n=== DETECTED TECHNOLOGIES ===\n${result.detectedTech.join(', ')}`)
  }
  if (result.structuredData.length > 0) {
    const sdSummary = result.structuredData.map((s) => {
      const sdParts = [`Type: ${s.type}`]
      if (s.name) sdParts.push(`Name: ${s.name}`)
      if (s.description) sdParts.push(`Description: ${s.description}`)
      const raw = s.raw as Record<string, unknown>
      if (raw.founder) sdParts.push(`Founder: ${JSON.stringify(raw.founder)}`)
      if (raw.employee) sdParts.push(`Employees: ${JSON.stringify(raw.employee)}`)
      if (raw.numberOfEmployees) sdParts.push(`Number of Employees: ${JSON.stringify(raw.numberOfEmployees)}`)
      if (raw.foundingDate) sdParts.push(`Founded: ${raw.foundingDate}`)
      if (raw.address) sdParts.push(`Address: ${JSON.stringify(raw.address)}`)
      if (raw.sameAs) sdParts.push(`Social profiles: ${JSON.stringify(raw.sameAs)}`)
      if (raw.offers) sdParts.push(`Offers/Pricing: ${JSON.stringify(raw.offers)}`)
      return sdParts.join(' | ')
    }).join('\n')
    parts.push(`\n=== STRUCTURED DATA (JSON-LD) ===\n${sdSummary}`)
  }
  if (result.teamMembers.length > 0) {
    parts.push(`\n=== TEAM MEMBERS ===\n${result.teamMembers.map((m) => `${m.name} — ${m.role}`).join('\n')}`)
  }
  if (result.teamDetailed.length > 0) {
    parts.push(`\n=== DETAILED TEAM ===\n${result.teamDetailed.map((m) => `${m.name} — ${m.role} (${m.level}${m.department ? ', ' + m.department : ''})`).join('\n')}`)
  }
  if (result.pricingData && result.pricingData.tiers.length > 0) {
    const pd = result.pricingData
    const pricingSummary = pd.tiers.map(t =>
      `${t.name}: ${t.price || 'N/A'}${t.billingPeriod ? ' (' + t.billingPeriod + ')' : ''} — ${t.features.slice(0, 5).join(', ')}`
    ).join('\n')
    parts.push(`\n=== PRICING TIERS ===\nModel: ${pd.pricingModel}\nLowest paid: ${pd.lowestPaidPrice || 'N/A'}\n${pricingSummary}`)
  }
  if (result.newsItems.length > 0) {
    parts.push(`\n=== RECENT NEWS ===\n${result.newsItems.map((n) => `[${n.date}] ${n.title} (${n.source})`).join('\n')}`)
  }

  parts.push(`\n=== SCRAPE METADATA ===\nPages scraped: ${result.pagesScraped}\nSitemap discovered: ${result.sitemapDiscovered}\nCategories found: ${Object.keys(result.categories).join(', ')}`)

  result.rawTexts = sanitizeForAI(parts.join('\n\n'))

  return result
}
