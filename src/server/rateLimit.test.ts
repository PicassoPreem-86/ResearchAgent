import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRateLimiter } from './rateLimit.js'
import { Hono } from 'hono'

function createTestApp(maxRequests: number, windowMs: number) {
  const app = new Hono()
  const limiter = createRateLimiter({ maxRequests, windowMs })
  app.use('*', limiter)
  app.get('/test', (c) => c.json({ ok: true }))
  return app
}

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', async () => {
    const app = createTestApp(5, 60_000)
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/test', {
        headers: { 'cf-connecting-ip': '10.0.0.1' },
      })
      expect(res.status).toBe(200)
    }
  })

  it('returns 429 after exceeding the limit', async () => {
    const app = createTestApp(3, 60_000)

    // Use up the limit
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/test', {
        headers: { 'cf-connecting-ip': '10.0.0.2' },
      })
      expect(res.status).toBe(200)
    }

    // Next request should be rate limited
    const res = await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.2' },
    })
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('Rate limit exceeded')
  })

  it('different IPs have independent limits', async () => {
    const app = createTestApp(2, 60_000)

    // IP A uses up limit
    for (let i = 0; i < 2; i++) {
      await app.request('/test', {
        headers: { 'cf-connecting-ip': '10.0.0.3' },
      })
    }

    // IP A is rate limited
    const resA = await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.3' },
    })
    expect(resA.status).toBe(429)

    // IP B is still fine
    const resB = await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.4' },
    })
    expect(resB.status).toBe(200)
  })

  it('resets after the window expires', async () => {
    vi.useFakeTimers()

    const app = createTestApp(2, 5_000)

    // Use up limit
    for (let i = 0; i < 2; i++) {
      await app.request('/test', {
        headers: { 'cf-connecting-ip': '10.0.0.5' },
      })
    }

    // Rate limited
    const blockedRes = await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.5' },
    })
    expect(blockedRes.status).toBe(429)

    // Advance past window
    vi.advanceTimersByTime(6_000)

    // Should be allowed again
    const newRes = await app.request('/test', {
      headers: { 'cf-connecting-ip': '10.0.0.5' },
    })
    expect(newRes.status).toBe(200)

    vi.useRealTimers()
  })

  it('uses "unknown" IP when no identifying header', async () => {
    const app = createTestApp(2, 60_000)

    for (let i = 0; i < 2; i++) {
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    }

    const res = await app.request('/test')
    expect(res.status).toBe(429)
  })
})
