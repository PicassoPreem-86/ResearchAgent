import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey } from './apiKeys.js'

describe('generateApiKey', () => {
  it('produces a key with the ra_ prefix', () => {
    const { key } = generateApiKey()
    expect(key).toMatch(/^ra_[a-f0-9]{64}$/)
  })

  it('produces a 64-character hex hash', () => {
    const { hash } = generateApiKey()
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generates unique keys each time', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.key).not.toBe(b.key)
    expect(a.hash).not.toBe(b.hash)
  })

  it('hash matches the key', () => {
    const { key, hash } = generateApiKey()
    expect(hashApiKey(key)).toBe(hash)
  })
})

describe('hashApiKey', () => {
  it('produces consistent hashes for the same input', () => {
    const key = 'ra_abc123'
    const hash1 = hashApiKey(key)
    const hash2 = hashApiKey(key)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', () => {
    const hash1 = hashApiKey('ra_key1')
    const hash2 = hashApiKey('ra_key2')
    expect(hash1).not.toBe(hash2)
  })

  it('returns a 64-char hex string', () => {
    const hash = hashApiKey('ra_test')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})
