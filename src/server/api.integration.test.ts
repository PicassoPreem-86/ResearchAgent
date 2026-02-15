import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { ProspectReport, ComparisonReport, ICP } from '../types/prospect.js'

// --- Fixture data ---

const mockScrapedData = {
  homepage: { url: 'https://example.com', title: 'Example', text: 'Example company page', links: [], meta: {} },
  about: null,
  careers: null,
  pricing: null,
  blog: null,
  jobListings: [],
  newsItems: [],
  detectedTech: ['React'],
  teamMembers: [],
  structuredData: [],
  rawTexts: 'Example company page',
}

const mockReport: ProspectReport = {
  company: {
    name: 'Example Inc',
    domain: 'example.com',
    description: 'A test company',
    industry: 'Technology',
    estimatedSize: '50-200',
    techStack: ['React', 'Node.js'],
    recentNews: [],
    keyProducts: ['Widget'],
    confidence: 75,
  },
  executiveSummary: 'Test summary',
  painPoints: [],
  jobInsights: [],
  email: { subject: 'Test', body: 'Hello', personalizationNotes: [], tone: 'casual', variant: 'A' },
  emails: [{ subject: 'Test', body: 'Hello', personalizationNotes: [], tone: 'casual', variant: 'A' }],
  swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  marketPosition: { segment: 'B2B', pricingTier: 'mid', targetAudience: 'SMBs', differentiators: [], marketMaturity: 'growing' },
  risks: { level: 'low', flags: [] },
  keyPeople: [],
  financialSignals: { fundingStage: 'Series A', estimatedRevenue: '$1M', growthIndicators: [], hiringVelocity: 'moderate' },
  competitiveLandscape: { competitors: [], moat: 'Technology', vulnerabilities: [] },
  strategicRecommendations: ['Test recommendation'],
  template: 'general',
  researchedAt: new Date().toISOString(),
}

const mockComparisonReport: ComparisonReport = {
  companies: [mockReport],
  comparison: {
    dimensions: [],
    summary: 'Test comparison',
    recommendation: 'Go with Example',
    companySummaries: [],
  },
  generatedAt: new Date().toISOString(),
}

// --- Mocks ---

// Mock serve so importing index.ts doesn't start a server
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}))

vi.mock('@hono/node-server/serve-static', () => ({
  serveStatic: vi.fn(() => vi.fn()),
}))

// Mock rate limiter (may not exist yet)
vi.mock('./rateLimit.js', () => ({
  createRateLimiter: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

// Mock cache (may not exist yet)
vi.mock('./cache.js', () => ({
  getCached: vi.fn(() => null),
  setCache: vi.fn(),
  getCacheStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0 })),
}))

// Mock scraper
vi.mock('./scraper.js', () => ({
  scrapeCompany: vi.fn(async () => mockScrapedData),
}))

// Mock analyzer
vi.mock('./analyzer.js', () => ({
  analyzeCompany: vi.fn(async () => mockReport),
  generateComparison: vi.fn(async () => mockComparisonReport),
}))

// Mock bulk
vi.mock('./bulk.js', () => ({
  parseCsvDomains: vi.fn((csv: string) => csv.split('\n').map((l: string) => l.trim()).filter(Boolean)),
  processBulk: vi.fn(async (domains: string[], onProgress: (p: unknown) => Promise<void>) => {
    for (const domain of domains) {
      await onProgress({ type: 'result', domain, status: 'success', report: mockReport })
    }
    await onProgress({ type: 'complete', total: domains.length, succeeded: domains.length, failed: 0 })
  }),
  generateCsv: vi.fn(() => 'domain,name\nexample.com,Example Inc\n'),
}))

// Mock history with in-memory store
let historyStore: ProspectReport[] = []
vi.mock('./history.js', () => ({
  saveReport: vi.fn((report: ProspectReport) => {
    const idx = historyStore.findIndex((r) => r.company.domain === report.company.domain)
    if (idx >= 0) historyStore[idx] = report
    else historyStore.unshift(report)
  }),
  getHistory: vi.fn(() => historyStore),
  deleteReport: vi.fn((domain: string) => {
    const before = historyStore.length
    historyStore = historyStore.filter((r) => r.company.domain !== domain)
    return historyStore.length < before
  }),
}))

// Mock ICP with in-memory store
let icpStore: ICP | null = null
vi.mock('./icp.js', () => ({
  saveICP: vi.fn((icp: ICP) => { icpStore = icp }),
  loadICP: vi.fn(() => icpStore),
}))

// Mock PDF
vi.mock('./pdf.js', () => ({
  generatePdf: vi.fn(async () => Buffer.from('%PDF-1.4 mock pdf content')),
  generateComparisonPdf: vi.fn(async () => Buffer.from('%PDF-1.4 mock comparison pdf')),
}))

// Mock discover
vi.mock('./discover.js', () => ({
  discoverByICP: vi.fn(async () => [{ domain: 'found.com', name: 'Found Inc', snippet: 'A company', source: 'search', matchScore: 85, matchReasons: ['Industry match'] }]),
  discoverLookalike: vi.fn(async () => [{ domain: 'similar.com', name: 'Similar Inc', snippet: 'Similar company', source: 'search', matchScore: 80, matchReasons: ['Similar tech'] }]),
  discoverByKeywords: vi.fn(async () => [{ domain: 'keyword.com', name: 'Keyword Co', snippet: 'Keyword match', source: 'search', matchScore: 70, matchReasons: ['Keyword match'] }]),
}))

// Mock talent
vi.mock('./talent.js', () => ({
  searchTalent: vi.fn(async () => ({
    search: { role: 'Engineer', skills: ['TypeScript'], location: undefined, seniority: undefined },
    targetRole: 'Engineer',
    profiles: [{ name: 'Jane', role: 'Engineer', department: 'Eng', skills: ['TypeScript'], matchScore: 90, matchReasons: ['Skill match'], fitSummary: 'Great fit' }],
    recruitingEmail: { subject: 'Opportunity', body: 'Hi', personalizationNotes: [], tone: 'casual' as const, variant: 'A' },
    personalizedOutreach: [],
    generatedAt: new Date().toISOString(),
  })),
}))

// Mock dotenv
vi.mock('dotenv/config', () => ({}))

// Now import the app after all mocks are set up
let app: Awaited<typeof import('./index.js')>['app']

beforeAll(async () => {
  const mod = await import('./index.js')
  app = mod.app
})

beforeEach(() => {
  historyStore = []
  icpStore = null
  vi.clearAllMocks()
})

// --- Helper ---

function req(method: string, path: string, body?: unknown) {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) init.body = JSON.stringify(body)
  return app.request(`http://localhost${path}`, init)
}

async function parseSSE(response: Response): Promise<Array<{ event: string; data: unknown }>> {
  const text = await response.text()
  const events: Array<{ event: string; data: unknown }> = []
  const blocks = text.split('\n\n').filter(Boolean)
  for (const block of blocks) {
    const lines = block.split('\n')
    let event = 'message'
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7)
      if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (data) {
      try {
        events.push({ event, data: JSON.parse(data) })
      } catch {
        events.push({ event, data })
      }
    }
  }
  return events
}

// --- Tests ---

describe('Health check', () => {
  it('GET /api/health returns status ok with metadata', async () => {
    const res = await req('GET', '/api/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('1.0.0')
    expect(body.environment).toBeDefined()
    expect(typeof body.uptime).toBe('number')
  })
})

describe('POST /api/research', () => {
  it('returns a report for a valid domain', async () => {
    const res = await req('POST', '/api/research', { domain: 'example.com' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.company.domain).toBe('example.com')
    expect(body.executiveSummary).toBeDefined()
  })

  it('returns 400 when domain is missing', async () => {
    const res = await req('POST', '/api/research', {})
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('domain')
  })

  it('returns 400 for invalid domain', async () => {
    const res = await req('POST', '/api/research', { domain: 'not a domain!!' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})

describe('POST /api/research/stream', () => {
  it('returns SSE events ending with complete stage', async () => {
    const res = await req('POST', '/api/research/stream', { domain: 'example.com' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const events = await parseSSE(res)
    expect(events.length).toBeGreaterThan(0)

    const last = events[events.length - 1]
    expect(last.event).toBe('progress')
    expect((last.data as Record<string, unknown>).stage).toBe('complete')
    expect((last.data as Record<string, unknown>).data).toBeDefined()
  })

  it('returns 400 when domain is missing', async () => {
    const res = await req('POST', '/api/research/stream', {})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/research/compare', () => {
  it('returns 400 when domains array is empty', async () => {
    const res = await req('POST', '/api/research/compare', { domains: [] })
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 5 domains', async () => {
    const res = await req('POST', '/api/research/compare', {
      domains: ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com'],
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('5')
  })

  it('streams comparison for valid domains', async () => {
    const res = await req('POST', '/api/research/compare', { domains: ['example.com', 'test.com'] })
    expect(res.status).toBe(200)

    const events = await parseSSE(res)
    const complete = events.find((e) => (e.data as Record<string, unknown>).stage === 'complete')
    expect(complete).toBeDefined()
  })
})

describe('POST /api/research/bulk', () => {
  it('returns 400 when no domains provided', async () => {
    const res = await req('POST', '/api/research/bulk', {})
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 50 domains', async () => {
    const domains = Array.from({ length: 51 }, (_, i) => `d${i}.com`)
    const res = await req('POST', '/api/research/bulk', { domains })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('50')
  })

  it('streams bulk progress for valid domains', async () => {
    const res = await req('POST', '/api/research/bulk', { domains: ['example.com', 'test.com'] })
    expect(res.status).toBe(200)

    const events = await parseSSE(res)
    expect(events.length).toBeGreaterThan(0)
  })
})

describe('POST /api/research/export', () => {
  it('returns CSV content', async () => {
    const res = await req('POST', '/api/research/export', {
      results: [{ domain: 'example.com', status: 'success', report: mockReport }],
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('example.com')
  })

  it('returns 400 when results array is missing', async () => {
    const res = await req('POST', '/api/research/export', {})
    expect(res.status).toBe(400)
  })
})

describe('History endpoints', () => {
  it('GET /api/history returns empty array initially', async () => {
    const res = await req('GET', '/api/history')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(0)
  })

  it('GET /api/history returns saved reports', async () => {
    historyStore = [mockReport]
    const res = await req('GET', '/api/history')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].company.domain).toBe('example.com')
  })

  it('DELETE /api/history/:domain removes a report', async () => {
    historyStore = [mockReport]
    const res = await req('DELETE', '/api/history/example.com')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('DELETE /api/history/:domain returns 404 for missing report', async () => {
    const res = await req('DELETE', '/api/history/nonexistent.com')
    expect(res.status).toBe(404)
  })
})

describe('ICP endpoints', () => {
  it('GET /api/icp returns null when no ICP saved', async () => {
    const res = await req('GET', '/api/icp')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('POST /api/icp saves ICP and GET returns it', async () => {
    const icp: ICP = {
      industries: ['SaaS'],
      sizeRange: '50-200',
      techStack: ['React'],
      keywords: ['AI'],
      geography: { regions: [], countries: ['US'], metros: [] },
      fundingStage: 'Series A',
    }

    const postRes = await req('POST', '/api/icp', icp)
    expect(postRes.status).toBe(200)
    const postBody = await postRes.json()
    expect(postBody.success).toBe(true)

    const getRes = await req('GET', '/api/icp')
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    expect(getBody.industries).toContain('SaaS')
  })

  it('POST /api/icp returns 400 when missing industries and keywords', async () => {
    const res = await req('POST', '/api/icp', { sizeRange: '10-50' })
    expect(res.status).toBe(400)
  })
})

describe('Discover endpoints', () => {
  it('POST /api/discover/icp returns companies', async () => {
    const res = await req('POST', '/api/discover/icp', {
      icp: { industries: ['SaaS'], keywords: ['AI'], sizeRange: '', techStack: [], geography: { regions: [], countries: [], metros: [] }, fundingStage: '' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.companies).toBeDefined()
    expect(body.companies.length).toBeGreaterThan(0)
  })

  it('POST /api/discover/icp returns 400 when icp is missing', async () => {
    const res = await req('POST', '/api/discover/icp', {})
    expect(res.status).toBe(400)
  })

  it('POST /api/discover/lookalike returns similar companies', async () => {
    const res = await req('POST', '/api/discover/lookalike', { domain: 'example.com' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.companies).toBeDefined()
    expect(body.referenceDomain).toBe('example.com')
  })

  it('POST /api/discover/lookalike returns 400 when domain is missing', async () => {
    const res = await req('POST', '/api/discover/lookalike', {})
    expect(res.status).toBe(400)
  })

  it('POST /api/discover/lookalike/stream returns SSE events', async () => {
    const res = await req('POST', '/api/discover/lookalike/stream', { domain: 'example.com' })
    expect(res.status).toBe(200)

    const events = await parseSSE(res)
    const complete = events.find((e) => (e.data as Record<string, unknown>).stage === 'complete')
    expect(complete).toBeDefined()
  })

  it('POST /api/discover/search returns companies for keywords', async () => {
    const res = await req('POST', '/api/discover/search', { keywords: ['AI', 'ML'] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.companies).toBeDefined()
  })

  it('POST /api/discover/search returns 400 when keywords is empty', async () => {
    const res = await req('POST', '/api/discover/search', { keywords: [] })
    expect(res.status).toBe(400)
  })
})

describe('Talent endpoints', () => {
  it('POST /api/talent/search returns talent report', async () => {
    const res = await req('POST', '/api/talent/search', { targetRole: 'Engineer', targetSkills: ['TypeScript'] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.targetRole).toBe('Engineer')
    expect(body.profiles).toBeDefined()
  })

  it('POST /api/talent/search returns 400 when targetRole is missing', async () => {
    const res = await req('POST', '/api/talent/search', { targetSkills: ['TypeScript'] })
    expect(res.status).toBe(400)
  })

  it('POST /api/talent/search/stream returns SSE events', async () => {
    const res = await req('POST', '/api/talent/search/stream', { targetRole: 'Engineer', targetSkills: ['TypeScript'] })
    expect(res.status).toBe(200)

    const events = await parseSSE(res)
    const complete = events.find((e) => (e.data as Record<string, unknown>).stage === 'complete')
    expect(complete).toBeDefined()
  })
})

describe('PDF export endpoints', () => {
  it('POST /api/export/pdf returns PDF blob', async () => {
    const res = await req('POST', '/api/export/pdf', mockReport)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
  })

  it('POST /api/export/pdf returns 400 for invalid report', async () => {
    const res = await req('POST', '/api/export/pdf', {})
    expect(res.status).toBe(400)
  })

  it('POST /api/export/comparison-pdf returns PDF blob', async () => {
    const res = await req('POST', '/api/export/comparison-pdf', mockComparisonReport)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
  })

  it('POST /api/export/comparison-pdf returns 400 for invalid data', async () => {
    const res = await req('POST', '/api/export/comparison-pdf', {})
    expect(res.status).toBe(400)
  })
})

describe('Cache stats endpoint', () => {
  it('GET /api/cache/stats returns cache info', async () => {
    const res = await req('GET', '/api/cache/stats')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('hits')
    expect(body).toHaveProperty('misses')
  })
})
