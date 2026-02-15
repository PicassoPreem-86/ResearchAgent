import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkQuota, recordUsage, createQuotaMiddleware } from './quota.js'
import { Hono } from 'hono'

// Mock @supabase/supabase-js
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn((table: string) => {
  if (table === 'usage_events') {
    return {
      select: mockSelect,
      insert: mockInsert,
    }
  }
  return {}
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('quota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('checkQuota', () => {
    it('returns allowed:true when Supabase is not configured', async () => {
      const result = await checkQuota('user-123', 'research')
      expect(result).toEqual({ allowed: true, used: 0, limit: Infinity })
    })

    it('returns allowed:true when under limit', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      })

      const result = await checkQuota('user-123', 'research')
      expect(result.allowed).toBe(true)
      expect(result.used).toBe(5)
      expect(result.limit).toBe(10)
    })

    it('returns allowed:false when at limit', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 10, error: null }),
          }),
        }),
      })

      const result = await checkQuota('user-123', 'research')
      expect(result.allowed).toBe(false)
      expect(result.used).toBe(10)
      expect(result.limit).toBe(10)
    })

    it('returns allowed:false when over limit', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        }),
      })

      const result = await checkQuota('user-123', 'research')
      expect(result.allowed).toBe(false)
      expect(result.used).toBe(15)
    })

    it('fails open on Supabase error', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
          }),
        }),
      })

      const result = await checkQuota('user-123', 'research')
      expect(result.allowed).toBe(true)
      expect(result.used).toBe(0)
    })

    it('uses correct limits for different quota types', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      })

      const research = await checkQuota('user-123', 'research')
      expect(research.limit).toBe(10)

      const compare = await checkQuota('user-123', 'compare')
      expect(compare.limit).toBe(3)

      const discover = await checkQuota('user-123', 'discover')
      expect(discover.limit).toBe(5)

      const talent = await checkQuota('user-123', 'talent')
      expect(talent.limit).toBe(5)
    })
  })

  describe('recordUsage', () => {
    it('does not throw when Supabase is not configured', async () => {
      await expect(recordUsage('user-123', 'research')).resolves.toBeUndefined()
    })

    it('inserts usage event when Supabase is configured', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockInsert.mockResolvedValue({ error: null })

      await recordUsage('user-123', 'research', 'stripe.com', 1500)

      expect(mockFrom).toHaveBeenCalledWith('usage_events')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        event_type: 'research',
        domain: 'stripe.com',
        tokens_used: 1500,
      })
    })
  })

  describe('createQuotaMiddleware', () => {
    it('passes through when no userId (dev mode)', async () => {
      const app = new Hono()
      app.post('/test', createQuotaMiddleware('research'), (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'test.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })

    it('returns 429 when quota exceeded', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 10, error: null }),
          }),
        }),
      })

      const app = new Hono()
      app.use('*', async (c, next) => {
        c.set('userId', 'user-123')
        return next()
      })
      app.post('/test', createQuotaMiddleware('research'), (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'test.com' }),
      })

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBe('Monthly quota exceeded')
      expect(body.quotaType).toBe('research')
      expect(body.used).toBe(10)
      expect(body.limit).toBe(10)
    })

    it('allows request when under quota', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        }),
      })
      mockInsert.mockResolvedValue({ error: null })

      const app = new Hono()
      app.use('*', async (c, next) => {
        c.set('userId', 'user-123')
        return next()
      })
      app.post('/test', createQuotaMiddleware('research'), (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'test.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })
  })

  describe('GET /api/usage format', () => {
    it('returns correct usage response format', async () => {
      // This tests the shape returned by checkQuota which feeds the endpoint
      const result = await checkQuota('user-123', 'research')
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('used')
      expect(result).toHaveProperty('limit')
      expect(typeof result.allowed).toBe('boolean')
      expect(typeof result.used).toBe('number')
    })
  })
})
