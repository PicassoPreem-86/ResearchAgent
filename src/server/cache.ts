import type { ScrapedCompanyData } from './scraper.js'

interface CacheEntry<T> {
  key: string
  value: T
  expiresAt: number
  prev: CacheEntry<T> | null
  next: CacheEntry<T> | null
}

class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>()
  private head: CacheEntry<T> | null = null
  private tail: CacheEntry<T> | null = null
  private maxSize: number
  private defaultTTL: number
  private hits = 0
  private misses = 0

  constructor(maxSize = 500, defaultTTL = 30 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      this.misses++
      return undefined
    }
    this.hits++
    this.moveToFront(entry)
    return entry.value
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.map.has(key)) {
      this.delete(key)
    }
    while (this.map.size >= this.maxSize) {
      this.evictLRU()
    }
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      prev: null,
      next: this.head,
    }
    if (this.head) this.head.prev = entry
    this.head = entry
    if (!this.tail) this.tail = entry
    this.map.set(key, entry)
  }

  delete(key: string): boolean {
    const entry = this.map.get(key)
    if (!entry) return false
    this.unlink(entry)
    this.map.delete(key)
    return true
  }

  clear(): void {
    this.map.clear()
    this.head = null
    this.tail = null
    this.hits = 0
    this.misses = 0
  }

  get size(): number {
    return this.map.size
  }

  getStats(): { size: number; hits: number; misses: number; maxSize: number } {
    return { size: this.map.size, hits: this.hits, misses: this.misses, maxSize: this.maxSize }
  }

  private moveToFront(entry: CacheEntry<T>): void {
    if (entry === this.head) return
    this.unlink(entry)
    entry.prev = null
    entry.next = this.head
    if (this.head) this.head.prev = entry
    this.head = entry
    if (!this.tail) this.tail = entry
  }

  private unlink(entry: CacheEntry<T>): void {
    if (entry.prev) {
      entry.prev.next = entry.next
    } else {
      this.head = entry.next
    }
    if (entry.next) {
      entry.next.prev = entry.prev
    } else {
      this.tail = entry.prev
    }
    entry.prev = null
    entry.next = null
  }

  private evictLRU(): void {
    if (!this.tail) return
    const key = this.tail.key
    this.unlink(this.tail)
    this.map.delete(key)
  }
}

const cache = new LRUCache<ScrapedCompanyData>(500, 30 * 60 * 1000)

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
}

export function getCached(domain: string): ScrapedCompanyData | null {
  const key = normalizeDomain(domain)
  return cache.get(key) ?? null
}

export function setCache(domain: string, data: ScrapedCompanyData): void {
  const key = normalizeDomain(domain)
  cache.set(key, data)
}

export function clearCache(domain?: string): void {
  if (domain) {
    cache.delete(normalizeDomain(domain))
  } else {
    cache.clear()
  }
}

export function getCacheStats(): { size: number; hits: number; misses: number } {
  const stats = cache.getStats()
  return { size: stats.size, hits: stats.hits, misses: stats.misses }
}

// Export for testing
export { LRUCache }
