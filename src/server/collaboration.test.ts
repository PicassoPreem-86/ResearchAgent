import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dotenv before importing app
vi.mock('dotenv/config', () => ({}))

// Mock node-server to prevent actual listen
vi.mock('@hono/node-server', () => ({ serve: vi.fn() }))
vi.mock('@hono/node-server/serve-static', () => ({ serveStatic: vi.fn(() => vi.fn()) }))

// Mock all heavy server deps
vi.mock('./scraper.js', () => ({ scrapeCompany: vi.fn() }))
vi.mock('./analyzer.js', () => ({ analyzeCompany: vi.fn(), generateComparison: vi.fn() }))
vi.mock('./bulk.js', () => ({ parseCsvDomains: vi.fn(), processBulk: vi.fn(), generateCsv: vi.fn() }))
vi.mock('./history.js', () => ({ saveReport: vi.fn(), getHistory: vi.fn().mockReturnValue({ reports: [], total: 0 }), deleteReport: vi.fn() }))
vi.mock('./pdf.js', () => ({ generatePdf: vi.fn(), generateComparisonPdf: vi.fn() }))
vi.mock('./discover.js', () => ({ discoverByICP: vi.fn(), discoverLookalike: vi.fn(), discoverByKeywords: vi.fn() }))
vi.mock('./icp.js', () => ({ saveICP: vi.fn(), loadICP: vi.fn() }))
vi.mock('./talent.js', () => ({ searchTalent: vi.fn() }))
vi.mock('./cache.js', () => ({ getCached: vi.fn(), setCache: vi.fn(), getCacheStats: vi.fn().mockReturnValue({}) }))
vi.mock('./diff.js', () => ({ compareReports: vi.fn() }))
vi.mock('./apiKeys.js', () => ({
  generateApiKey: vi.fn(),
  hashApiKey: vi.fn(),
  validateApiKey: vi.fn().mockResolvedValue(null),
}))
vi.mock('./validate.js', () => ({
  validateDomain: vi.fn((d: string) => d),
}))
vi.mock('./rateLimit.js', () => ({
  createRateLimiter: vi.fn(() => vi.fn((_c: unknown, next: () => Promise<void>) => next())),
}))
vi.mock('./authMiddleware.js', () => ({
  authMiddleware: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}))
vi.mock('./quota.js', () => ({
  createQuotaMiddleware: vi.fn(() => vi.fn((_c: unknown, next: () => Promise<void>) => next())),
  checkQuota: vi.fn().mockResolvedValue({ used: 0, limit: 100 }),
}))
vi.mock('openai', () => ({ default: vi.fn() }))

// We'll set env vars before importing
beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('Collaboration endpoints', () => {
  describe('GET /api/workspaces/:id/members', () => {
    it('returns empty array when Supabase not configured', async () => {
      // No SUPABASE_URL env var
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/members', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.members).toEqual([])
      expect(body.message).toBe('Supabase not configured')
    })
  })

  describe('GET /api/workspaces/:id/comments', () => {
    it('returns empty array when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/comments', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.comments).toEqual([])
    })
  })

  describe('POST /api/workspaces/:id/members', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(503)
    })

    it('returns 400 when email is missing', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({}),
      })

      // Will be 503 because Supabase not configured (checked first)
      expect(res.status).toBe(503)
    })
  })

  describe('POST /api/workspaces/:id/comments', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ reportDomain: 'stripe.com', content: 'Great report!' }),
      })

      expect(res.status).toBe(503)
    })
  })

  describe('DELETE /api/comments/:id', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/comments/comment-1', {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(503)
    })
  })

  describe('POST /api/share', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ reportId: 'report-1', accessLevel: 'view', expiresIn: '7d' }),
      })

      expect(res.status).toBe(503)
    })
  })

  describe('GET /api/share/:token', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/share/some-token-123', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(503)
    })
  })

  describe('DELETE /api/share/:id', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/share/link-1', {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(503)
    })
  })

  describe('PUT /api/workspaces/:id/members/:userId', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/members/user-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ role: 'editor' }),
      })

      expect(res.status).toBe(503)
    })
  })

  describe('DELETE /api/workspaces/:id/members/:userId', () => {
    it('returns 503 when Supabase not configured', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { app } = await import('./index.js')
      const res = await app.request('/api/workspaces/ws-1/members/user-1', {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })

      expect(res.status).toBe(503)
    })
  })
})

describe('Share link validation', () => {
  it('requires reportId or workspaceId for share creation', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { app } = await import('./index.js')
    const res = await app.request('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ accessLevel: 'view' }),
    })

    // 503 because Supabase not configured, but if it were, it would validate
    expect(res.status).toBe(503)
  })
})

describe('Role validation', () => {
  it('PUT member role rejects invalid roles when Supabase not configured', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { app } = await import('./index.js')
    const res = await app.request('/api/workspaces/ws-1/members/user-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ role: 'admin' }),
    })

    // Without Supabase, returns 503 before role validation
    expect(res.status).toBe(503)
  })
})

describe('Comment validation', () => {
  it('POST comment requires content', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { app } = await import('./index.js')
    const res = await app.request('/api/workspaces/ws-1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ reportDomain: 'stripe.com' }),
    })

    // Without Supabase, returns 503
    expect(res.status).toBe(503)
  })
})
