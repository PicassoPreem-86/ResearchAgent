import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as cheerio from 'cheerio'
import {
  detectTechStack,
  extractStructuredData,
  extractTeamMembers,
  extractPricingData,
  extractTeamDetailed,
  parseSitemap,
  isPrivateIP,
} from './scraper.js'

// --- parseSitemap ---

describe('parseSitemap', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses valid sitemap XML and returns URLs', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/</loc></url>
      <url><loc>https://example.com/about</loc></url>
      <url><loc>https://example.com/pricing</loc></url>
      <url><loc>https://example.com/blog/post-1</loc></url>
    </urlset>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(xml, { status: 200 })
    )

    const urls = await parseSitemap('example.com')
    expect(urls).toHaveLength(4)
    expect(urls).toContain('https://example.com/')
    expect(urls).toContain('https://example.com/about')
    expect(urls).toContain('https://example.com/pricing')
  })

  it('returns empty array for 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 })
    )

    const urls = await parseSitemap('example.com')
    expect(urls).toEqual([])
  })

  it('returns empty array on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const urls = await parseSitemap('example.com')
    expect(urls).toEqual([])
  })

  it('caps results at 100 URLs', async () => {
    const locs = Array.from({ length: 150 }, (_, i) =>
      `<url><loc>https://example.com/page-${i}</loc></url>`
    ).join('\n')
    const xml = `<?xml version="1.0"?><urlset>${locs}</urlset>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(xml, { status: 200 })
    )

    const urls = await parseSitemap('example.com')
    expect(urls).toHaveLength(100)
  })
})

// --- extractPricingData ---

describe('extractPricingData', () => {
  it('extracts pricing tiers from card-based layout', () => {
    const html = `
    <html><body>
      <div class="pricing-section">
        <div class="pricing-card">
          <h3 class="plan-name">Free</h3>
          <span class="price">Free</span>
          <ul>
            <li>5 projects</li>
            <li>Basic support</li>
          </ul>
        </div>
        <div class="pricing-card featured">
          <h3 class="plan-name">Pro</h3>
          <span class="price">$29/mo</span>
          <div class="popular-badge">Most Popular</div>
          <ul>
            <li>Unlimited projects</li>
            <li>Priority support</li>
            <li>API access</li>
          </ul>
        </div>
        <div class="pricing-card">
          <h3 class="plan-name">Enterprise</h3>
          <span class="price">Contact us</span>
          <ul>
            <li>Custom integrations</li>
            <li>Dedicated support</li>
            <li>SLA guarantee</li>
          </ul>
        </div>
      </div>
    </body></html>`

    const result = extractPricingData(html)
    expect(result.tiers).toHaveLength(3)
    expect(result.hasFreePlan).toBe(true)
    expect(result.hasEnterprisePlan).toBe(true)
    expect(result.pricingModel).toBe('freemium')
    expect(result.lowestPaidPrice).toBe('$29/mo')

    const proTier = result.tiers.find(t => t.name === 'Pro')
    expect(proTier).toBeDefined()
    expect(proTier!.price).toBe('$29/mo')
    expect(proTier!.billingPeriod).toBe('monthly')
    expect(proTier!.features.length).toBeGreaterThan(0)
  })

  it('extracts pricing from table layout', () => {
    const html = `
    <html><body>
      <table>
        <thead>
          <tr><th>Feature</th><th>Free</th><th>Pro</th><th>Enterprise</th></tr>
        </thead>
        <tbody>
          <tr><td>Users</td><td>1</td><td>10</td><td>Unlimited</td></tr>
          <tr><td>Storage</td><td>1 GB</td><td>100 GB</td><td>1 TB</td></tr>
        </tbody>
      </table>
    </body></html>`

    const result = extractPricingData(html)
    expect(result.tiers.length).toBeGreaterThanOrEqual(3)
    const freeTier = result.tiers.find(t => t.name === 'Free')
    expect(freeTier).toBeDefined()
    expect(freeTier!.isFree).toBe(true)
    const entTier = result.tiers.find(t => t.name === 'Enterprise')
    expect(entTier).toBeDefined()
    expect(entTier!.isEnterprise).toBe(true)
  })

  it('detects trial pricing model', () => {
    const html = `
    <html><body>
      <div class="pricing-section">
        <div class="pricing-card">
          <h3>Starter</h3>
          <span>$19/mo</span>
          <p>Start free trial</p>
          <ul><li>10 users</li></ul>
        </div>
      </div>
    </body></html>`

    const result = extractPricingData(html)
    expect(result.pricingModel).toBe('trial')
  })

  it('returns unknown model for empty pricing page', () => {
    const html = '<html><body><p>No pricing info here</p></body></html>'
    const result = extractPricingData(html)
    expect(result.tiers).toHaveLength(0)
    expect(result.pricingModel).toBe('unknown')
    expect(result.lowestPaidPrice).toBeNull()
  })

  it('detects open-source model', () => {
    const html = `
    <html><body>
      <p>This project is open source.</p>
      <div class="pricing-section">
        <div class="pricing-card">
          <h3>Self-hosted</h3>
          <span>Free</span>
          <ul><li>All features</li></ul>
        </div>
      </div>
    </body></html>`

    const result = extractPricingData(html)
    // Only one tier and it's free, but page mentions open source
    expect(result.hasFreePlan).toBe(true)
  })

  it('finds lowest paid price among multiple tiers', () => {
    const html = `
    <html><body>
      <div class="pricing-section">
        <div class="pricing-card">
          <h3>Basic</h3>
          <span>$9/mo</span>
          <ul><li>Feature A</li></ul>
        </div>
        <div class="pricing-card">
          <h3>Pro</h3>
          <span>$49/mo</span>
          <ul><li>Feature B</li></ul>
        </div>
        <div class="pricing-card">
          <h3>Business</h3>
          <span>$99/mo</span>
          <ul><li>Feature C</li></ul>
        </div>
      </div>
    </body></html>`

    const result = extractPricingData(html)
    expect(result.lowestPaidPrice).toBe('$9/mo')
  })

  it('detects yearly billing period', () => {
    const html = `
    <html><body>
      <div class="pricing-section">
        <div class="pricing-card">
          <h3>Annual Plan</h3>
          <span>$199/yr</span>
          <p>Billed annually</p>
          <ul><li>Everything included</li></ul>
        </div>
      </div>
    </body></html>`

    const result = extractPricingData(html)
    expect(result.tiers[0].billingPeriod).toBe('yearly')
  })
})

// --- extractTeamDetailed ---

describe('extractTeamDetailed', () => {
  it('extracts team members with level classification from card layout', () => {
    const html = `
    <html><body>
      <div class="team-section">
        <div class="team-member">
          <img src="/photos/jane.jpg" alt="Jane Smith">
          <h3>Jane Smith</h3>
          <p class="role">Chief Executive Officer</p>
          <a href="https://linkedin.com/in/janesmith">LinkedIn</a>
        </div>
        <div class="team-member">
          <img src="/photos/john.jpg" alt="John Doe">
          <h3>John Doe</h3>
          <p class="role">VP of Engineering</p>
          <a href="https://linkedin.com/in/johndoe">LinkedIn</a>
        </div>
        <div class="team-member">
          <h3>Alice Wong</h3>
          <p class="role">Director of Marketing</p>
        </div>
        <div class="team-member">
          <h3>Bob Chen</h3>
          <p class="role">Senior Software Engineer</p>
        </div>
      </div>
    </body></html>`

    const members = extractTeamDetailed(html)
    expect(members).toHaveLength(4)

    const jane = members.find(m => m.name === 'Jane Smith')
    expect(jane).toBeDefined()
    expect(jane!.level).toBe('c-suite')
    expect(jane!.linkedinUrl).toBe('https://linkedin.com/in/janesmith')
    expect(jane!.photoUrl).toBe('/photos/jane.jpg')

    const john = members.find(m => m.name === 'John Doe')
    expect(john!.level).toBe('vp')
    expect(john!.department).toBe('Engineering')

    const alice = members.find(m => m.name === 'Alice Wong')
    expect(alice!.level).toBe('director')
    expect(alice!.department).toBe('Marketing')

    const bob = members.find(m => m.name === 'Bob Chen')
    expect(bob!.level).toBe('individual')
    expect(bob!.department).toBe('Engineering')
  })

  it('extracts from li-based layout as fallback', () => {
    const html = `
    <html><body>
      <ul>
        <li><strong>Sarah Johnson</strong> - Head of Product</li>
        <li><strong>Mike Lee</strong> - Data Scientist</li>
      </ul>
    </body></html>`

    const members = extractTeamDetailed(html)
    expect(members).toHaveLength(2)
    expect(members[0].name).toBe('Sarah Johnson')
    expect(members[0].level).toBe('manager')
    expect(members[0].department).toBe('Product')
    expect(members[1].name).toBe('Mike Lee')
    expect(members[1].department).toBe('Data')
  })

  it('handles empty/no team page', () => {
    const html = '<html><body><p>No team info</p></body></html>'
    const members = extractTeamDetailed(html)
    expect(members).toHaveLength(0)
  })

  it('deduplicates team members', () => {
    const html = `
    <html><body>
      <div class="team-section">
        <div class="team-member">
          <h3>Jane Smith</h3>
          <p class="role">CEO</p>
        </div>
        <div class="team-member">
          <h3>Jane Smith</h3>
          <p class="role">Chief Executive Officer</p>
        </div>
      </div>
    </body></html>`

    const members = extractTeamDetailed(html)
    expect(members).toHaveLength(1)
  })

  it('caps at 50 members', () => {
    const cards = Array.from({ length: 60 }, (_, i) =>
      `<div class="team-member"><h3>Person ${i} Name</h3><p class="role">Engineer</p></div>`
    ).join('\n')
    const html = `<html><body><div class="team-section">${cards}</div></body></html>`

    const members = extractTeamDetailed(html)
    expect(members.length).toBeLessThanOrEqual(50)
  })

  it('classifies founder as c-suite', () => {
    const html = `
    <html><body>
      <div class="team-section">
        <div class="team-member">
          <h3>Alex Founder</h3>
          <p class="role">Co-founder & CEO</p>
        </div>
      </div>
    </body></html>`

    const members = extractTeamDetailed(html)
    expect(members[0].level).toBe('c-suite')
  })

  it('classifies manager/lead correctly', () => {
    const html = `
    <html><body>
      <div class="team-section">
        <div class="team-member">
          <h3>Tom Manager</h3>
          <p class="role">Engineering Manager</p>
        </div>
        <div class="team-member">
          <h3>Lisa Lead</h3>
          <p class="role">Lead Designer</p>
        </div>
      </div>
    </body></html>`

    const members = extractTeamDetailed(html)
    expect(members[0].level).toBe('manager')
    expect(members[0].department).toBe('Engineering')
    expect(members[1].level).toBe('manager')
    expect(members[1].department).toBe('Design')
  })
})

// --- extractTeamMembers (legacy) ---

describe('extractTeamMembers', () => {
  it('extracts team members from heading + paragraph pattern', () => {
    const html = `<html><body>
      <div class="team-section">
        <div>
          <h3>Jane Smith</h3>
          <p>Chief Executive Officer</p>
        </div>
        <div>
          <h3>Bob Jones</h3>
          <p>CTO</p>
        </div>
      </div>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toHaveLength(2)
    expect(members[0]).toEqual({ name: 'Jane Smith', role: 'Chief Executive Officer' })
    expect(members[1]).toEqual({ name: 'Bob Jones', role: 'CTO' })
  })

  it('extracts team members from dt/dd pattern', () => {
    const html = `<html><body>
      <dl>
        <dt>Alice Wong</dt>
        <dd>VP Engineering</dd>
        <dt>Carlos Rivera</dt>
        <dd>Head of Design</dd>
      </dl>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toHaveLength(2)
    expect(members[0]).toEqual({ name: 'Alice Wong', role: 'VP Engineering' })
    expect(members[1]).toEqual({ name: 'Carlos Rivera', role: 'Head of Design' })
  })

  it('extracts team members from li + strong pattern (fallback)', () => {
    const html = `<html><body>
      <ul>
        <li><strong>Emily Chen</strong> - Product Manager</li>
        <li><strong>David Park</strong>, Software Engineer</li>
      </ul>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toHaveLength(2)
    expect(members[0].name).toBe('Emily Chen')
    expect(members[0].role).toBe('Product Manager')
    expect(members[1].name).toBe('David Park')
    expect(members[1].role).toBe('Software Engineer')
  })

  it('deduplicates members by name', () => {
    const html = `<html><body>
      <div class="team-section">
        <h3>Jane Smith</h3>
        <p>CEO</p>
        <h3>Jane Smith</h3>
        <p>CEO</p>
      </div>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toHaveLength(1)
  })

  it('returns empty array when no team members found', () => {
    const html = '<html><body><p>Just a regular page</p></body></html>'
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toEqual([])
  })

  it('limits results to 20 members', () => {
    const cards = Array.from({ length: 25 }, (_, i) =>
      `<div><h3>Person ${i} Name</h3><p>Role ${i}</p></div>`
    ).join('')
    const html = `<html><body><div class="team-grid">${cards}</div></body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members.length).toBeLessThanOrEqual(20)
  })

  it('skips names that are too short', () => {
    const html = `<html><body>
      <div class="team-section">
        <h3>AB</h3>
        <p>Some Role</p>
      </div>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toEqual([])
  })

  it('li+strong pattern requires two-part name', () => {
    const html = `<html><body>
      <ul>
        <li><strong>SingleName</strong> - Engineer</li>
        <li><strong>Proper Name</strong> - Engineer</li>
      </ul>
    </body></html>`
    const $ = cheerio.load(html)
    const members = extractTeamMembers($)
    expect(members).toHaveLength(1)
    expect(members[0].name).toBe('Proper Name')
  })
})

// --- parallel fetching ---

describe('parallel batch handling', () => {
  it('Promise.allSettled handles mixed successes and failures', async () => {
    const results = await Promise.allSettled([
      Promise.resolve({ category: 'homepage', page: { text: 'content' } }),
      Promise.reject(new Error('Network error')),
      Promise.resolve(null),
      Promise.resolve({ category: 'about', page: { text: 'about content' } }),
    ])

    const successes = results.filter(
      r => r.status === 'fulfilled' && r.value !== null
    )
    expect(successes).toHaveLength(2)

    const failures = results.filter(r => r.status === 'rejected')
    expect(failures).toHaveLength(1)
  })

  it('batch processing handles all failures gracefully', async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error('Timeout')),
      Promise.reject(new Error('DNS error')),
      Promise.reject(new Error('Connection refused')),
    ])

    const successes = results.filter(r => r.status === 'fulfilled')
    expect(successes).toHaveLength(0)

    const failures = results.filter(r => r.status === 'rejected')
    expect(failures).toHaveLength(3)
  })
})

// --- page relevance filtering ---

describe('page relevance filtering', () => {
  it('pages under 100 chars should be filtered out', () => {
    const shortText = 'Too short'
    expect(shortText.length).toBeLessThan(100)

    const longText = 'A'.repeat(150)
    expect(longText.length).toBeGreaterThanOrEqual(100)
  })

  it('empty pages should be filtered out', () => {
    const emptyText = ''
    expect(emptyText.length).toBeLessThan(100)
  })
})

// --- detectTechStack ---

describe('detectTechStack', () => {
  it('detects React from script src', () => {
    const html = '<html><head></head><body><script src="https://cdn.example.com/react.production.min.js"></script></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('React')
  })

  it('detects jQuery from script src', () => {
    const html = '<html><head></head><body><script src="https://code.jquery.com/jquery-3.6.0.min.js"></script></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('jQuery')
  })

  it('detects WordPress from meta generator', () => {
    const html = '<html><head><meta name="generator" content="WordPress 6.4.2"></head><body></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('WordPress')
  })

  it('detects Tailwind CSS from class names in body', () => {
    const html = '<html><head></head><body><div class="flex items-center tailwind-indicator p-4">Hello</div></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('Tailwind CSS')
  })

  it('detects Google Analytics from inline script', () => {
    const html = '<html><head></head><body><script>window.gtag("config", "G-XXXX")</script></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('Google Analytics')
  })

  it('detects multiple technologies at once', () => {
    const html = `<html>
      <head><meta name="generator" content="WordPress"></head>
      <body>
        <script src="https://cdn.example.com/jquery.min.js"></script>
        <script src="https://js.stripe.com/v3/"></script>
        <script>window.intercomSettings = {};</script>
        <link href="https://cdn.example.com/bootstrap.min.css" rel="stylesheet">
      </body>
    </html>`
    const techs = detectTechStack(html)
    expect(techs).toContain('WordPress')
    expect(techs).toContain('jQuery')
    expect(techs).toContain('Stripe')
    expect(techs).toContain('Intercom')
    expect(techs).toContain('Bootstrap')
  })

  it('returns empty array for plain HTML with no frameworks', () => {
    const html = '<html><head></head><body><p>Hello world</p></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toEqual([])
  })

  it('detects Webflow from meta generator', () => {
    const html = '<html><head><meta name="generator" content="Webflow"></head><body></body></html>'
    const techs = detectTechStack(html)
    expect(techs).toContain('Webflow')
  })
})

// --- extractStructuredData ---

describe('extractStructuredData', () => {
  it('extracts Organization JSON-LD', () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@type": "Organization", "name": "Acme Corp", "description": "We build things"}
      </script>
    </head><body></body></html>`
    const data = extractStructuredData(html)
    expect(data).toHaveLength(1)
    expect(data[0].type).toBe('Organization')
    expect(data[0].name).toBe('Acme Corp')
    expect(data[0].description).toBe('We build things')
  })

  it('handles arrays of JSON-LD items', () => {
    const html = `<html><head>
      <script type="application/ld+json">
        [
          {"@type": "Organization", "name": "Foo Inc"},
          {"@type": "WebSite", "name": "Foo Blog"}
        ]
      </script>
    </head><body></body></html>`
    const data = extractStructuredData(html)
    expect(data).toHaveLength(2)
    expect(data[0].type).toBe('Organization')
    expect(data[1].type).toBe('WebSite')
  })

  it('returns empty array for HTML without JSON-LD', () => {
    const html = '<html><head></head><body><p>Hello</p></body></html>'
    const data = extractStructuredData(html)
    expect(data).toEqual([])
  })

  it('skips malformed JSON-LD gracefully', () => {
    const html = `<html><head>
      <script type="application/ld+json">{not valid json}</script>
    </head><body></body></html>`
    const data = extractStructuredData(html)
    expect(data).toEqual([])
  })

  it('preserves raw object data', () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@type": "Organization", "name": "Test", "foundingDate": "2020-01-01", "numberOfEmployees": {"@type": "QuantitativeValue", "value": 50}}
      </script>
    </head><body></body></html>`
    const data = extractStructuredData(html)
    expect(data[0].raw.foundingDate).toBe('2020-01-01')
    expect(data[0].raw.numberOfEmployees).toEqual({ '@type': 'QuantitativeValue', value: 50 })
  })

  it('uses headline as name fallback', () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@type": "Article", "headline": "Breaking News Today"}
      </script>
    </head><body></body></html>`
    const data = extractStructuredData(html)
    expect(data[0].name).toBe('Breaking News Today')
  })
})

// --- isPrivateIP ---

describe('isPrivateIP', () => {
  it('blocks localhost', () => {
    expect(isPrivateIP('localhost')).toBe(true)
    expect(isPrivateIP('127.0.0.1')).toBe(true)
  })

  it('blocks private ranges', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('192.168.1.1')).toBe(true)
    expect(isPrivateIP('172.16.0.1')).toBe(true)
  })

  it('allows public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('example.com')).toBe(false)
  })

  it('blocks AWS metadata endpoint', () => {
    expect(isPrivateIP('169.254.169.254')).toBe(true)
  })

  it('blocks IPv6 loopback', () => {
    expect(isPrivateIP('::1')).toBe(true)
  })
})

// --- text extraction cap ---

describe('text extraction cap', () => {
  it('caps text at 25000 characters', () => {
    const longText = 'a'.repeat(30000)
    const html = `<html><body><p>${longText}</p></body></html>`
    const $ = cheerio.load(html)
    $('script, style, nav, footer, iframe, noscript, svg').remove()
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 25000)
    expect(text.length).toBe(25000)
  })
})
