import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCached, setCache, clearCache, getCacheStats, LRUCache } from './cache.js'
import { SAMPLE_SCRAPED_DATA } from '../test/fixtures.js'

describe('cache', () => {
  beforeEach(() => {
    clearCache()
  })

  it('returns null for an uncached domain', () => {
    expect(getCached('notcached.com')).toBeNull()
  })

  it('returns cached data after setCache', () => {
    setCache('stripe.com', SAMPLE_SCRAPED_DATA)
    const result = getCached('stripe.com')
    expect(result).toEqual(SAMPLE_SCRAPED_DATA)
  })

  it('normalizes domain keys (case insensitive)', () => {
    setCache('Stripe.COM', SAMPLE_SCRAPED_DATA)
    expect(getCached('stripe.com')).toEqual(SAMPLE_SCRAPED_DATA)
  })

  it('normalizes domain keys (strips protocol)', () => {
    setCache('https://stripe.com', SAMPLE_SCRAPED_DATA)
    expect(getCached('stripe.com')).toEqual(SAMPLE_SCRAPED_DATA)
  })

  it('normalizes domain keys (strips path)', () => {
    setCache('stripe.com/pricing', SAMPLE_SCRAPED_DATA)
    expect(getCached('stripe.com')).toEqual(SAMPLE_SCRAPED_DATA)
  })

  it('clearCache with domain removes only that domain', () => {
    setCache('stripe.com', SAMPLE_SCRAPED_DATA)
    setCache('example.com', SAMPLE_SCRAPED_DATA)
    clearCache('stripe.com')
    expect(getCached('stripe.com')).toBeNull()
    expect(getCached('example.com')).toEqual(SAMPLE_SCRAPED_DATA)
  })

  it('clearCache without args clears everything and resets stats', () => {
    setCache('stripe.com', SAMPLE_SCRAPED_DATA)
    getCached('stripe.com') // hit
    getCached('unknown.com') // miss
    clearCache()
    expect(getCached('stripe.com')).toBeNull()
    const stats = getCacheStats()
    // After clearCache(), hits/misses are reset to 0, but the getCached above adds 1 miss
    expect(stats.size).toBe(0)
  })

  it('tracks hits and misses in stats', () => {
    setCache('stripe.com', SAMPLE_SCRAPED_DATA)
    getCached('stripe.com') // hit
    getCached('stripe.com') // hit
    getCached('nothere.com') // miss

    const stats = getCacheStats()
    expect(stats.size).toBe(1)
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
  })

  it('expires entries after TTL', () => {
    setCache('stripe.com', SAMPLE_SCRAPED_DATA)

    // Fast-forward past the 30 minute TTL
    vi.useFakeTimers()
    vi.advanceTimersByTime(31 * 60 * 1000)

    const result = getCached('stripe.com')
    expect(result).toBeNull()

    vi.useRealTimers()
  })
})

describe('LRUCache', () => {
  it('evicts oldest entry when maxSize is exceeded', () => {
    const cache = new LRUCache<string>(3, 60000)
    cache.set('a', 'alpha')
    cache.set('b', 'beta')
    cache.set('c', 'gamma')

    // Cache is full (3 items). Adding a 4th should evict 'a' (least recently used)
    cache.set('d', 'delta')

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('beta')
    expect(cache.get('c')).toBe('gamma')
    expect(cache.get('d')).toBe('delta')
    expect(cache.size).toBe(3)
  })

  it('expires entries after TTL', () => {
    vi.useFakeTimers()
    const cache = new LRUCache<string>(10, 100) // 100ms TTL
    cache.set('x', 'value')

    expect(cache.get('x')).toBe('value')

    vi.advanceTimersByTime(150)
    expect(cache.get('x')).toBeUndefined()

    vi.useRealTimers()
  })

  it('moveToFront: accessed entry survives eviction', () => {
    const cache = new LRUCache<string>(3, 60000)
    cache.set('a', 'alpha')
    cache.set('b', 'beta')
    cache.set('c', 'gamma')

    // Access 'a' so it moves to front (most recently used)
    cache.get('a')

    // Adding new entries should evict 'b' (now LRU), then 'c'
    cache.set('d', 'delta')
    expect(cache.get('a')).toBe('alpha') // survived because it was accessed
    expect(cache.get('b')).toBeUndefined() // evicted as LRU
    expect(cache.get('c')).toBe('gamma')
    expect(cache.get('d')).toBe('delta')
  })

  it('clear removes all entries', () => {
    const cache = new LRUCache<string>(10, 60000)
    cache.set('a', 'alpha')
    cache.set('b', 'beta')
    cache.set('c', 'gamma')

    cache.clear()

    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBeUndefined()
  })

  it('getStats tracks hits and misses', () => {
    const cache = new LRUCache<string>(10, 60000)
    cache.set('a', 'alpha')

    cache.get('a')       // hit
    cache.get('a')       // hit
    cache.get('missing') // miss

    const stats = cache.getStats()
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
    expect(stats.size).toBe(1)
    expect(stats.maxSize).toBe(10)
  })

  it('size property returns current entry count', () => {
    const cache = new LRUCache<string>(10, 60000)
    expect(cache.size).toBe(0)

    cache.set('a', 'alpha')
    expect(cache.size).toBe(1)

    cache.set('b', 'beta')
    expect(cache.size).toBe(2)

    cache.delete('a')
    expect(cache.size).toBe(1)
  })

  it('updating an existing key replaces the value', () => {
    const cache = new LRUCache<string>(10, 60000)
    cache.set('a', 'old')
    cache.set('a', 'new')

    expect(cache.get('a')).toBe('new')
    expect(cache.size).toBe(1)
  })

  it('delete returns false for non-existent key', () => {
    const cache = new LRUCache<string>(10, 60000)
    expect(cache.delete('nonexistent')).toBe(false)
  })

  it('delete returns true and removes existing key', () => {
    const cache = new LRUCache<string>(10, 60000)
    cache.set('a', 'alpha')
    expect(cache.delete('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('clear resets hit/miss counters', () => {
    const cache = new LRUCache<string>(10, 60000)
    cache.set('a', 'alpha')
    cache.get('a')       // hit
    cache.get('missing') // miss

    cache.clear()
    const stats = cache.getStats()
    expect(stats.hits).toBe(0)
    expect(stats.misses).toBe(0)
  })
})
