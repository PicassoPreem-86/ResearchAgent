import type { Context, Next } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>()

  // Clean up expired entries every 60 seconds
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key)
      }
    }
  }, 60_000).unref()

  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip')
      || c.req.header('x-real-ip')
      || 'unknown'
    const now = Date.now()

    const entry = store.get(ip)

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + config.windowMs })
      await next()
      return
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return c.json(
        { error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` },
        429
      )
    }

    entry.count++
    await next()
  }
}
