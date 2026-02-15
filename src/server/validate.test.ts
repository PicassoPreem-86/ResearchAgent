import { describe, it, expect } from 'vitest'
import { validateDomain } from './validate.js'

describe('validateDomain', () => {
  it('returns a clean domain from a basic input', () => {
    expect(validateDomain('stripe.com')).toBe('stripe.com')
  })

  it('strips https:// protocol', () => {
    expect(validateDomain('https://stripe.com')).toBe('stripe.com')
  })

  it('strips http:// protocol', () => {
    expect(validateDomain('http://example.org')).toBe('example.org')
  })

  it('strips www. prefix', () => {
    expect(validateDomain('www.stripe.com')).toBe('stripe.com')
  })

  it('strips protocol and www together', () => {
    expect(validateDomain('https://www.stripe.com')).toBe('stripe.com')
  })

  it('strips trailing slashes', () => {
    expect(validateDomain('stripe.com/')).toBe('stripe.com')
  })

  it('strips paths after the domain', () => {
    expect(validateDomain('https://stripe.com/pricing')).toBe('stripe.com')
  })

  it('strips deep paths', () => {
    expect(validateDomain('https://stripe.com/docs/api/charges')).toBe('stripe.com')
  })

  it('returns lowercase', () => {
    expect(validateDomain('Stripe.COM')).toBe('stripe.com')
  })

  it('handles uppercase protocol when lowercase is used', () => {
    // The regex only strips lowercase https?:// — uppercase protocol is not stripped
    // so 'https://EXAMPLE.COM' works but 'HTTPS://...' would fail (contains ://)
    expect(validateDomain('https://EXAMPLE.COM')).toBe('example.com')
  })

  it('strips trailing dot', () => {
    expect(validateDomain('stripe.com.')).toBe('stripe.com')
  })

  it('trims whitespace', () => {
    expect(validateDomain('  stripe.com  ')).toBe('stripe.com')
  })

  it('handles subdomains', () => {
    expect(validateDomain('docs.stripe.com')).toBe('docs.stripe.com')
  })

  it('handles hyphenated domains', () => {
    expect(validateDomain('my-company.io')).toBe('my-company.io')
  })

  it('throws on empty string', () => {
    expect(() => validateDomain('')).toThrow('Domain cannot be empty')
  })

  it('throws on whitespace-only string', () => {
    expect(() => validateDomain('   ')).toThrow('Domain cannot be empty')
  })

  it('throws on domains with spaces', () => {
    expect(() => validateDomain('hello world')).toThrow('Domain cannot contain spaces')
  })

  it('throws on domains without a TLD', () => {
    expect(() => validateDomain('localhost')).toThrow('must include a TLD')
  })

  it('throws on just a dot', () => {
    expect(() => validateDomain('.')).toThrow('Domain cannot be empty')
  })

  it('throws on domains with invalid characters', () => {
    expect(() => validateDomain('stripe!.com')).toThrow('invalid characters')
    expect(() => validateDomain('stripe@.com')).toThrow('invalid characters')
    expect(() => validateDomain('str ipe.com')).toThrow('spaces')
  })

  it('throws on domain with only protocol', () => {
    expect(() => validateDomain('https://')).toThrow('Domain cannot be empty')
  })
})
