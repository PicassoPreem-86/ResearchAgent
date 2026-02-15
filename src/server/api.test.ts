import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProspectReport, ICP } from '../types/prospect.js'

// ----- Mock all heavy dependencies before importing anything -----
// vi.mock is hoisted, so factories cannot reference top-level variables.
// Use inline data or vi.fn() and configure in beforeEach.

vi.mock('dotenv/config', () => ({}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }) } }
  },
}))

vi.mock('./firecrawl.js', () => ({ firecrawlScrape: vi.fn().mockResolvedValue(null) }))

vi.mock('./scraper.js', () => ({
  scrapeCompany: vi.fn(),
  scrapeNews: vi.fn().mockResolvedValue([]),
}))

vi.mock('./analyzer.js', () => ({
  analyzeCompany: vi.fn(),
  generateComparison: vi.fn(),
}))

vi.mock('./discover.js', () => ({
  discoverByICP: vi.fn().mockResolvedValue([]),
  discoverLookalike: vi.fn().mockResolvedValue([]),
  discoverByKeywords: vi.fn().mockResolvedValue([]),
}))

vi.mock('./talent.js', () => ({
  searchTalent: vi.fn(),
}))

vi.mock('./history.js', () => ({
  saveReport: vi.fn(),
  getHistory: vi.fn(),
  deleteReport: vi.fn(),
}))

vi.mock('./icp.js', () => ({
  saveICP: vi.fn(),
  loadICP: vi.fn(),
}))

vi.mock('./pdf.js', () => ({
  generatePdf: vi.fn(),
  generateComparisonPdf: vi.fn(),
}))

vi.mock('./cache.js', () => ({
  getCached: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0 }),
}))

vi.mock('./rateLimit.js', () => ({
  createRateLimiter: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => { await next() }),
}))

vi.mock('./validate.js', () => ({
  validateDomain: vi.fn((d: string) => {
    if (!d || !d.includes('.')) throw new Error('Invalid domain')
    return d.toLowerCase()
  }),
}))

vi.mock('@hono/node-server', () => ({ serve: vi.fn() }))
vi.mock('@hono/node-server/serve-static', () => ({
  serveStatic: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => { await next() }),
}))

// Now import mocked modules
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { scrapeCompany } from './scraper.js'
import { analyzeCompany, generateComparison } from './analyzer.js'
import { parseCsvDomains } from './bulk.js'
import { saveReport, getHistory, deleteReport } from './history.js'
import { generatePdf } from './pdf.js'
import { saveICP, loadICP } from './icp.js'
import { validateDomain } from './validate.js'
import { searchTalent } from './talent.js'
import { getCacheStats } from './cache.js'
import { migrateGeography } from '../types/prospect.js'

// ----- Fixture data -----

function makeMockReport(domain = 'acme.com'): ProspectReport {
  return {
    company: { name: 'Acme Corp', domain, description: 'A test company', industry: 'Technology', estimatedSize: '50-200', techStack: ['React'], recentNews: [], keyProducts: ['Widget'], confidence: 0.9 },
    executiveSummary: 'Acme is a tech company.',
    painPoints: [{ title: 'Scale', description: 'Need to scale', evidence: 'Hiring', severity: 'high', confidence: 0.85 }],
    jobInsights: [{ title: 'Senior Engineer', department: 'Engineering', inference: 'Growing' }],
    email: { subject: 'Hi Acme', body: 'Dear team...', personalizationNotes: ['Scaling'], tone: 'casual', variant: 'default' },
    emails: [],
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    marketPosition: { segment: 'SaaS', pricingTier: 'mid', targetAudience: 'Enterprise', differentiators: ['AI'], marketMaturity: 'growing' },
    risks: { level: 'low', flags: [] },
    keyPeople: [{ name: 'John Doe', role: 'CEO', context: 'Founder' }],
    financialSignals: { fundingStage: 'Series A', estimatedRevenue: '$5M', growthIndicators: ['Hiring'], hiringVelocity: 'high' },
    competitiveLandscape: { competitors: [], moat: 'AI tech', vulnerabilities: [] },
    strategicRecommendations: ['Focus on enterprise'],
    template: 'general',
    researchedAt: '2024-01-01T00:00:00.000Z',
  }
}

function makeMockScrapedData() {
  return {
    homepage: { url: 'https://acme.com', title: 'Acme Corp', text: 'Welcome to Acme', links: [], meta: {} },
    about: null, careers: null, pricing: null, blog: null,
    jobListings: [], newsItems: [], detectedTech: ['React'], teamMembers: [], structuredData: [], rawTexts: 'Welcome to Acme',
  }
}

// ----- Build test app -----

function createTestApp() {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ status: 'ok' }))
  app.get('/api/cache/stats', (c) => c.json(getCacheStats()))

  app.post('/api/research', async (c) => {
    try {
      const body = await c.req.json<{ domain: string }>()
      if (!body.domain) return c.json({ error: 'domain is required' }, 400)
      let domain: string
      try { domain = validateDomain(body.domain) } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
      }
      const scrapedData = await scrapeCompany(domain)
      const report = await (analyzeCompany as any)(domain, scrapedData)
      saveReport(report)
      return c.json(report)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.post('/api/research/stream', async (c) => {
    try {
      const body = await c.req.json<{ domain: string }>()
      if (!body.domain) return c.json({ error: 'domain is required' }, 400)
      let domain: string
      try { domain = validateDomain(body.domain) } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
      }
      return streamSSE(c, async (stream) => {
        try {
          const scrapedData = await scrapeCompany(domain)
          const report = await (analyzeCompany as any)(domain, scrapedData)
          saveReport(report)
          await stream.writeSSE({ data: JSON.stringify({ stage: 'complete', message: 'done', progress: 100, data: report }), event: 'progress' })
        } catch (err) {
          await stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: err instanceof Error ? err.message : 'Unknown' }), event: 'progress' })
        }
      })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.post('/api/research/compare', async (c) => {
    try {
      const body = await c.req.json<{ domains: string[] }>()
      if (!body.domains || !Array.isArray(body.domains) || body.domains.length === 0)
        return c.json({ error: 'domains array is required' }, 400)
      if (body.domains.length > 5)
        return c.json({ error: 'Maximum 5 companies for comparison' }, 400)
      let domains: string[]
      try { domains = body.domains.map((d) => validateDomain(d)) } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
      }
      return streamSSE(c, async (stream) => {
        const reports = []
        for (const domain of domains) {
          const scrapedData = await scrapeCompany(domain)
          const report = await (analyzeCompany as any)(domain, scrapedData)
          reports.push(report)
        }
        const comparison = await (generateComparison as any)(reports)
        await stream.writeSSE({ data: JSON.stringify({ stage: 'complete', progress: 100, data: comparison }), event: 'progress' })
      })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.post('/api/research/bulk', async (c) => {
    try {
      const body = await c.req.json<{ domains?: string[]; csv?: string }>()
      let domains: string[] = []
      if (body.domains && Array.isArray(body.domains)) {
        try { domains = body.domains.map((d) => validateDomain(d)) } catch (err) {
          return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
        }
      } else if (body.csv) {
        domains = parseCsvDomains(body.csv)
      }
      if (domains.length === 0) return c.json({ error: 'No valid domains provided. Send "domains" array or "csv" string.' }, 400)
      if (domains.length > 100) return c.json({ error: 'Maximum 100 domains per batch' }, 400)
      return c.json({ accepted: true, count: domains.length })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.get('/api/history', (c) => c.json(getHistory()))
  app.delete('/api/history/:domain', (c) => {
    const domain = c.req.param('domain')
    const deleted = deleteReport(domain)
    if (!deleted) return c.json({ error: 'Report not found' }, 404)
    return c.json({ success: true })
  })

  app.get('/api/icp', (c) => c.json(loadICP() || null))
  app.post('/api/icp', async (c) => {
    try {
      const icp = await c.req.json<ICP>()
      if (!icp.industries && !icp.keywords) return c.json({ error: 'ICP must have at least industries or keywords' }, 400)
      saveICP({
        industries: icp.industries || [],
        sizeRange: icp.sizeRange || '',
        techStack: icp.techStack || [],
        keywords: icp.keywords || [],
        geography: migrateGeography(icp.geography),
        fundingStage: icp.fundingStage || '',
      })
      return c.json({ success: true })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.post('/api/export/pdf', async (c) => {
    try {
      const report = await c.req.json<ProspectReport>()
      if (!report.company || !report.company.name) return c.json({ error: 'Valid ProspectReport is required' }, 400)
      const pdfBuffer = await generatePdf(report)
      return new Response(new Uint8Array(pdfBuffer as any), { headers: { 'Content-Type': 'application/pdf' } })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  app.post('/api/talent/search', async (c) => {
    try {
      const body = await c.req.json<{ targetRole: string; targetSkills?: string[] }>()
      if (!body.targetRole) return c.json({ error: 'targetRole is required' }, 400)
      const report = await searchTalent(body.targetRole, body.targetSkills || [])
      return c.json(report)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
  })

  return app
}

// ----- Tests -----

let app: ReturnType<typeof createTestApp>

beforeEach(() => {
  vi.clearAllMocks()
  app = createTestApp()

  // Configure default mock return values
  vi.mocked(scrapeCompany).mockResolvedValue(makeMockScrapedData() as any)
  vi.mocked(analyzeCompany).mockResolvedValue(makeMockReport() as any)
  vi.mocked(generateComparison).mockResolvedValue({
    companies: [makeMockReport()],
    comparison: { dimensions: [], summary: 'Test', recommendation: 'Pick Acme', companySummaries: [] },
    generatedAt: '2024-01-01T00:00:00.000Z',
  } as any)
  vi.mocked(getHistory).mockReturnValue([])
  vi.mocked(deleteReport).mockReturnValue(false)
  vi.mocked(loadICP).mockReturnValue(null)
  vi.mocked(generatePdf).mockResolvedValue(Buffer.from('fake-pdf') as any)
  vi.mocked(searchTalent).mockResolvedValue({
    search: { role: 'Engineer', skills: ['TypeScript'] },
    targetRole: 'Engineer',
    profiles: [],
    recruitingEmail: { subject: 'Hi', body: 'Join us', personalizationNotes: [], tone: 'casual', variant: 'default' },
    personalizedOutreach: [],
    generatedAt: '2024-01-01T00:00:00.000Z',
  } as any)
})

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
  })
})

describe('POST /api/research', () => {
  it('returns a report for valid domain', async () => {
    const res = await app.request('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'acme.com' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.company.domain).toBe('acme.com')
    expect(data.company.name).toBe('Acme Corp')
  })

  it('returns 400 when domain is missing', async () => {
    const res = await app.request('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('domain')
  })

  it('returns 400 for invalid domain', async () => {
    const res = await app.request('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'notadomain' }),
    })
    expect(res.status).toBe(400)
  })

  it('saves report to history after research', async () => {
    await app.request('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'acme.com' }),
    })
    expect(saveReport).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/research/stream', () => {
  it('returns SSE response for valid domain', async () => {
    const res = await app.request('/api/research/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'acme.com' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })

  it('returns 400 when domain is missing', async () => {
    const res = await app.request('/api/research/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('SSE body contains complete stage with report data', async () => {
    const res = await app.request('/api/research/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'acme.com' }),
    })
    const text = await res.text()
    expect(text).toContain('"stage":"complete"')
    expect(text).toContain('Acme Corp')
  })
})

describe('POST /api/research/compare', () => {
  it('returns 400 when domains array is empty', async () => {
    const res = await app.request('/api/research/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 5 domains', async () => {
    const res = await app.request('/api/research/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com'] }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Maximum 5')
  })

  it('streams SSE with compare data for valid domains', async () => {
    const res = await app.request('/api/research/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: ['acme.com', 'beta.com'] }),
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('"stage":"complete"')
  })
})

describe('POST /api/research/bulk', () => {
  it('accepts valid domains array', async () => {
    const res = await app.request('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: ['acme.com', 'beta.com'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.accepted).toBe(true)
    expect(data.count).toBe(2)
  })

  it('returns 400 when no domains provided', async () => {
    const res = await app.request('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 100 domains', async () => {
    const domains = Array.from({ length: 101 }, (_, i) => `d${i}.com`)
    const res = await app.request('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('100')
  })

  it('parses CSV input', async () => {
    const res = await app.request('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: 'acme.com\nbeta.com' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(2)
  })
})

describe('GET /api/history', () => {
  it('returns empty array initially', async () => {
    const res = await app.request('/api/history')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual([])
  })

  it('returns saved reports', async () => {
    vi.mocked(getHistory).mockReturnValue([makeMockReport()])
    const res = await app.request('/api/history')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].company.domain).toBe('acme.com')
  })
})

describe('DELETE /api/history/:domain', () => {
  it('deletes an existing report', async () => {
    vi.mocked(deleteReport).mockReturnValue(true)
    const res = await app.request('/api/history/acme.com', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 404 for non-existent domain', async () => {
    vi.mocked(deleteReport).mockReturnValue(false)
    const res = await app.request('/api/history/nope.com', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

describe('ICP endpoints', () => {
  it('GET /api/icp returns null initially', async () => {
    const res = await app.request('/api/icp')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeNull()
  })

  it('POST /api/icp saves ICP', async () => {
    const res = await app.request('/api/icp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industries: ['SaaS'], keywords: ['AI'], sizeRange: '50-200' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(saveICP).toHaveBeenCalled()
  })

  it('POST /api/icp returns 400 without industries or keywords', async () => {
    const res = await app.request('/api/icp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sizeRange: '10-50' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/export/pdf', () => {
  it('returns PDF content for valid report', async () => {
    const res = await app.request('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMockReport()),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })

  it('returns 400 for invalid report', async () => {
    const res = await app.request('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: {} }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/talent/search', () => {
  it('returns talent report for valid role', async () => {
    const res = await app.request('/api/talent/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: 'Senior Engineer', targetSkills: ['TypeScript'] }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.targetRole).toBe('Engineer')
  })

  it('returns 400 without targetRole', async () => {
    const res = await app.request('/api/talent/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSkills: ['TypeScript'] }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/cache/stats', () => {
  it('returns cache stats', async () => {
    const res = await app.request('/api/cache/stats')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('size')
    expect(data).toHaveProperty('hits')
    expect(data).toHaveProperty('misses')
  })
})
