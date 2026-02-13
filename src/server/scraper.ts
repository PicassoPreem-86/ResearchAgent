import * as cheerio from 'cheerio'

export interface ScrapedPage {
  url: string
  title: string
  text: string
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
}

export interface ScrapeDetailEvent {
  url: string
  status: 'fetching' | 'success' | 'failed'
  pageType: 'homepage' | 'about' | 'careers'
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string | null> {
  try {
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

  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000)

  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) links.push(href)
  })

  return { url, title, text, links, meta }
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

function findAboutPage(page: ScrapedPage, baseUrl: string): string | null {
  const aboutPatterns = [/\/about/i, /\/company/i, /\/who-we-are/i, /\/our-story/i]
  for (const link of page.links) {
    for (const pattern of aboutPatterns) {
      if (pattern.test(link)) {
        if (link.startsWith('http')) return link
        return baseUrl + (link.startsWith('/') ? link : '/' + link)
      }
    }
  }
  return baseUrl + '/about'
}

function findCareersPage(page: ScrapedPage, baseUrl: string): string | null {
  const careerPatterns = [/\/career/i, /\/jobs/i, /\/join/i, /\/hiring/i, /\/work-with-us/i, /\/positions/i]
  for (const link of page.links) {
    for (const pattern of careerPatterns) {
      if (pattern.test(link)) {
        if (link.startsWith('http')) return link
        return baseUrl + (link.startsWith('/') ? link : '/' + link)
      }
    }
  }
  return baseUrl + '/careers'
}

function findTeamPage(page: ScrapedPage, baseUrl: string): string | null {
  const teamPatterns = [/\/team/i, /\/people/i, /\/leadership/i, /\/our-team/i, /\/staff/i, /\/management/i]
  for (const link of page.links) {
    for (const pattern of teamPatterns) {
      if (pattern.test(link)) {
        if (link.startsWith('http')) return link
        return baseUrl + (link.startsWith('/') ? link : '/' + link)
      }
    }
  }
  return null
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

function findPricingPage(page: ScrapedPage, baseUrl: string): string | null {
  const patterns = [/\/pricing/i, /\/plans/i, /\/packages/i, /\/subscribe/i]
  for (const link of page.links) {
    for (const pattern of patterns) {
      if (pattern.test(link)) {
        if (link.startsWith('http')) return link
        return baseUrl + (link.startsWith('/') ? link : '/' + link)
      }
    }
  }
  return null
}

function findBlogPage(page: ScrapedPage, baseUrl: string): string | null {
  const patterns = [/\/blog/i, /\/resources/i, /\/insights/i, /\/news/i, /\/articles/i]
  for (const link of page.links) {
    for (const pattern of patterns) {
      if (pattern.test(link)) {
        if (link.startsWith('http')) return link
        return baseUrl + (link.startsWith('/') ? link : '/' + link)
      }
    }
  }
  return null
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

export async function scrapeCompany(
  domain: string,
  onProgress?: (message: string) => void | Promise<void>,
  onScrapeDetail?: (event: ScrapeDetailEvent) => void | Promise<void>
): Promise<ScrapedCompanyData> {
  const baseUrl = normalizeUrl(domain)
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
  }

  // Scrape homepage
  onProgress?.('Fetching homepage...')
  await onScrapeDetail?.({ url: baseUrl, status: 'fetching', pageType: 'homepage' })
  const homepageHtml = await fetchPage(baseUrl)
  if (homepageHtml) {
    result.homepage = extractPage(homepageHtml, baseUrl)
    result.detectedTech = detectTechStack(homepageHtml)
    result.structuredData = extractStructuredData(homepageHtml)
    await onScrapeDetail?.({ url: baseUrl, status: 'success', pageType: 'homepage' })
  } else {
    await onScrapeDetail?.({ url: baseUrl, status: 'failed', pageType: 'homepage' })
  }

  // Find and scrape about page
  const aboutUrl = result.homepage ? findAboutPage(result.homepage, baseUrl) : baseUrl + '/about'
  if (aboutUrl) {
    onProgress?.('Scanning about page...')
    await onScrapeDetail?.({ url: aboutUrl, status: 'fetching', pageType: 'about' })
    const aboutHtml = await fetchPage(aboutUrl)
    if (aboutHtml) {
      result.about = extractPage(aboutHtml, aboutUrl)
      const $about = cheerio.load(aboutHtml)
      const aboutMembers = extractTeamMembers($about)
      if (aboutMembers.length > 0) {
        result.teamMembers = aboutMembers
      }
      await onScrapeDetail?.({ url: aboutUrl, status: 'success', pageType: 'about' })
    } else {
      await onScrapeDetail?.({ url: aboutUrl, status: 'failed', pageType: 'about' })
    }
  }

  // Find and scrape team page if present
  if (result.homepage && result.teamMembers.length === 0) {
    const teamUrl = findTeamPage(result.homepage, baseUrl)
    if (teamUrl) {
      onProgress?.('Scanning team page...')
      const teamHtml = await fetchPage(teamUrl)
      if (teamHtml) {
        const $team = cheerio.load(teamHtml)
        result.teamMembers = extractTeamMembers($team)
      }
    }
  }

  // Find and scrape careers page
  const careersUrl = result.homepage ? findCareersPage(result.homepage, baseUrl) : baseUrl + '/careers'
  if (careersUrl) {
    onProgress?.('Scanning careers page...')
    await onScrapeDetail?.({ url: careersUrl, status: 'fetching', pageType: 'careers' })
    const careersHtml = await fetchPage(careersUrl)
    if (careersHtml) {
      result.careers = extractPage(careersHtml, careersUrl)
      const $ = cheerio.load(careersHtml)
      result.jobListings = extractJobListings($)
      await onScrapeDetail?.({ url: careersUrl, status: 'success', pageType: 'careers' })
    } else {
      await onScrapeDetail?.({ url: careersUrl, status: 'failed', pageType: 'careers' })
    }
  }

  // Scrape pricing page if available
  if (result.homepage) {
    const pricingUrl = findPricingPage(result.homepage, baseUrl)
    if (pricingUrl) {
      onProgress?.('Scanning pricing page...')
      const pricingHtml = await fetchPage(pricingUrl)
      if (pricingHtml) {
        result.pricing = extractPage(pricingHtml, pricingUrl)
      }
    }
  }

  // Scrape blog/resources for recent activity signals
  if (result.homepage) {
    const blogUrl = findBlogPage(result.homepage, baseUrl)
    if (blogUrl) {
      onProgress?.('Scanning blog & resources...')
      const blogHtml = await fetchPage(blogUrl)
      if (blogHtml) {
        result.blog = extractPage(blogHtml, blogUrl)
      }
    }
  }

  // Scrape news
  const companyName = result.homepage?.title?.split(/[|\-–—]/)?.[0]?.trim() || domain.split('.')[0]
  onProgress?.('Searching for recent news...')
  result.newsItems = await scrapeNews(companyName, domain)

  // Compile raw texts for AI analysis
  const parts: string[] = []
  if (result.homepage) {
    parts.push(`=== HOMEPAGE (${result.homepage.url}) ===\nTitle: ${result.homepage.title}\n${result.homepage.text}`)
    if (Object.keys(result.homepage.meta).length > 0) {
      parts.push(`Meta: ${JSON.stringify(result.homepage.meta)}`)
    }
  }
  if (result.about) {
    parts.push(`\n=== ABOUT PAGE (${result.about.url}) ===\nTitle: ${result.about.title}\n${result.about.text}`)
  }
  if (result.careers) {
    parts.push(`\n=== CAREERS PAGE (${result.careers.url}) ===\nTitle: ${result.careers.title}\n${result.careers.text}`)
  }
  if (result.pricing) {
    parts.push(`\n=== PRICING PAGE (${result.pricing.url}) ===\nTitle: ${result.pricing.title}\n${result.pricing.text}`)
  }
  if (result.blog) {
    parts.push(`\n=== BLOG / RESOURCES (${result.blog.url}) ===\nTitle: ${result.blog.title}\n${result.blog.text.slice(0, 5000)}`)
  }
  if (result.jobListings.length > 0) {
    parts.push(`\n=== JOB LISTINGS ===\n${result.jobListings.join('\n')}`)
  }
  if (result.detectedTech.length > 0) {
    parts.push(`\n=== DETECTED TECHNOLOGIES ===\n${result.detectedTech.join(', ')}`)
  }
  if (result.structuredData.length > 0) {
    const sdSummary = result.structuredData.map((s) => {
      const parts = [`Type: ${s.type}`]
      if (s.name) parts.push(`Name: ${s.name}`)
      if (s.description) parts.push(`Description: ${s.description}`)
      // Include select useful fields
      const raw = s.raw as Record<string, unknown>
      if (raw.founder) parts.push(`Founder: ${JSON.stringify(raw.founder)}`)
      if (raw.employee) parts.push(`Employees: ${JSON.stringify(raw.employee)}`)
      if (raw.numberOfEmployees) parts.push(`Number of Employees: ${JSON.stringify(raw.numberOfEmployees)}`)
      if (raw.foundingDate) parts.push(`Founded: ${raw.foundingDate}`)
      if (raw.address) parts.push(`Address: ${JSON.stringify(raw.address)}`)
      if (raw.sameAs) parts.push(`Social profiles: ${JSON.stringify(raw.sameAs)}`)
      if (raw.offers) parts.push(`Offers/Pricing: ${JSON.stringify(raw.offers)}`)
      return parts.join(' | ')
    }).join('\n')
    parts.push(`\n=== STRUCTURED DATA (JSON-LD) ===\n${sdSummary}`)
  }
  if (result.teamMembers.length > 0) {
    parts.push(`\n=== TEAM MEMBERS ===\n${result.teamMembers.map((m) => `${m.name} — ${m.role}`).join('\n')}`)
  }
  if (result.newsItems.length > 0) {
    parts.push(`\n=== RECENT NEWS ===\n${result.newsItems.map((n) => `[${n.date}] ${n.title} (${n.source})`).join('\n')}`)
  }

  result.rawTexts = parts.join('\n\n')

  return result
}
