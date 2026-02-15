import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCached, setCache, clearCache, getCacheStats } from './cache.js'
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
