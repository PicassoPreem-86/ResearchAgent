import type { ScrapedCompanyData } from './scraper.js'

interface CacheEntry<T> {
  data: T
  cachedAt: number
  expiresAt: number
}

const TTL = 30 * 60 * 1000 // 30 minutes

const store = new Map<string, CacheEntry<ScrapedCompanyData>>()
let hits = 0
let misses = 0

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000).unref()

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
}

export function getCached(domain: string): ScrapedCompanyData | null {
  const key = normalizeDomain(domain)
  const entry = store.get(key)

  if (!entry) {
    misses++
    return null
  }

  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    misses++
    return null
  }

  hits++
  return entry.data
}

export function setCache(domain: string, data: ScrapedCompanyData): void {
  const key = normalizeDomain(domain)
  const now = Date.now()
  store.set(key, {
    data,
    cachedAt: now,
    expiresAt: now + TTL,
  })
}

export function clearCache(domain?: string): void {
  if (domain) {
    store.delete(normalizeDomain(domain))
  } else {
    store.clear()
    hits = 0
    misses = 0
  }
}

export function getCacheStats(): { size: number; hits: number; misses: number } {
  return { size: store.size, hits, misses }
}
