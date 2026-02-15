import { describe, it, expect } from 'vitest'
import {
  migrateGeography,
  geoTargetToQueryString,
  geoTargetToLabel,
  hasGeoSelections,
  type GeoTarget,
} from './prospect.js'

describe('migrateGeography', () => {
  it('returns empty geo target for undefined input', () => {
    const result = migrateGeography(undefined)
    expect(result).toEqual({ regions: [], countries: [], metros: [] })
  })

  it('returns empty geo target for a plain string input', () => {
    const result = migrateGeography('United States')
    expect(result).toEqual({ regions: [], countries: [], metros: [] })
  })

  it('passes through a valid GeoTarget object', () => {
    const geo: GeoTarget = {
      regions: ['North America'],
      countries: ['US'],
      metros: ['San Francisco'],
    }
    const result = migrateGeography(geo)
    expect(result).toEqual(geo)
  })

  it('fills missing arrays with empty arrays', () => {
    const partial = { regions: ['EMEA'] } as unknown as GeoTarget
    const result = migrateGeography(partial)
    expect(result.regions).toEqual(['EMEA'])
    expect(result.countries).toEqual([])
    expect(result.metros).toEqual([])
  })

  it('returns a new object each time (not the same reference)', () => {
    const a = migrateGeography(undefined)
    const b = migrateGeography(undefined)
    expect(a).not.toBe(b)
  })
})

describe('geoTargetToQueryString', () => {
  it('returns empty string when all arrays are empty', () => {
    expect(geoTargetToQueryString({ regions: [], countries: [], metros: [] })).toBe('')
  })

  it('returns single quoted term for one entry', () => {
    expect(geoTargetToQueryString({ regions: [], countries: ['US'], metros: [] })).toBe('"US"')
  })

  it('joins multiple terms with OR', () => {
    const geo: GeoTarget = {
      regions: ['EMEA'],
      countries: ['UK'],
      metros: ['London'],
    }
    const result = geoTargetToQueryString(geo)
    expect(result).toBe('"London" OR "UK" OR "EMEA"')
  })

  it('puts metros first, then countries, then regions', () => {
    const geo: GeoTarget = {
      regions: ['Asia'],
      countries: ['Japan'],
      metros: ['Tokyo'],
    }
    const result = geoTargetToQueryString(geo)
    expect(result.indexOf('Tokyo')).toBeLessThan(result.indexOf('Japan'))
    expect(result.indexOf('Japan')).toBeLessThan(result.indexOf('Asia'))
  })
})

describe('geoTargetToLabel', () => {
  it('returns empty string for empty geo target', () => {
    expect(geoTargetToLabel({ regions: [], countries: [], metros: [] })).toBe('')
  })

  it('returns comma-separated label', () => {
    const geo: GeoTarget = {
      regions: [],
      countries: ['US'],
      metros: ['San Francisco', 'New York'],
    }
    expect(geoTargetToLabel(geo)).toBe('San Francisco, New York, US')
  })

  it('handles single term', () => {
    expect(geoTargetToLabel({ regions: ['Europe'], countries: [], metros: [] })).toBe('Europe')
  })
})

describe('hasGeoSelections', () => {
  it('returns false when all arrays are empty', () => {
    expect(hasGeoSelections({ regions: [], countries: [], metros: [] })).toBe(false)
  })

  it('returns true when regions has entries', () => {
    expect(hasGeoSelections({ regions: ['NA'], countries: [], metros: [] })).toBe(true)
  })

  it('returns true when countries has entries', () => {
    expect(hasGeoSelections({ regions: [], countries: ['US'], metros: [] })).toBe(true)
  })

  it('returns true when metros has entries', () => {
    expect(hasGeoSelections({ regions: [], countries: [], metros: ['NYC'] })).toBe(true)
  })

  it('returns true when multiple fields populated', () => {
    expect(hasGeoSelections({ regions: ['EU'], countries: ['DE'], metros: ['Berlin'] })).toBe(true)
  })
})
