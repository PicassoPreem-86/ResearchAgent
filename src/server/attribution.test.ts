import { describe, it, expect, vi } from 'vitest'

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: vi.fn() } }
    },
  }
})

import { buildDataFreshness, calculateSectionConfidence } from './analyzer.js'
import type { ScrapedPageMeta } from './scraper.js'
import type { SourcedClaim } from '../types/prospect.js'
import { getFreshnessColor } from '../components/results/DataFreshnessBar.js'

describe('buildDataFreshness', () => {
  it('computes freshness from successful pages', () => {
    const meta: ScrapedPageMeta[] = [
      { url: 'https://example.com', fetchedAt: '2025-01-01T00:00:00.000Z', category: 'homepage', charCount: 500, success: true },
      { url: 'https://example.com/about', fetchedAt: '2025-01-01T00:01:00.000Z', category: 'about', charCount: 300, success: true },
      { url: 'https://example.com/pricing', fetchedAt: '2025-01-01T00:02:00.000Z', category: 'pricing', charCount: 0, success: false },
    ]

    const result = buildDataFreshness(meta)

    expect(result.totalPagesFetched).toBe(3)
    expect(result.totalPagesSuccessful).toBe(2)
    expect(result.sources).toHaveLength(2)
    expect(result.oldestSource).toBe('2025-01-01T00:00:00.000Z')
    expect(result.newestSource).toBe('2025-01-01T00:01:00.000Z')
    expect(result.sources[0].category).toBe('homepage')
    expect(result.sources[0].charCount).toBe(500)
  })

  it('handles empty pageMeta', () => {
    const result = buildDataFreshness([])
    expect(result.totalPagesFetched).toBe(0)
    expect(result.totalPagesSuccessful).toBe(0)
    expect(result.sources).toHaveLength(0)
  })

  it('handles all failed pages', () => {
    const meta: ScrapedPageMeta[] = [
      { url: 'https://example.com', fetchedAt: '2025-01-01T00:00:00.000Z', category: 'homepage', charCount: 0, success: false },
    ]
    const result = buildDataFreshness(meta)
    expect(result.totalPagesFetched).toBe(1)
    expect(result.totalPagesSuccessful).toBe(0)
    expect(result.sources).toHaveLength(0)
  })
})

describe('calculateSectionConfidence', () => {
  it('scores 100% when all claims are sourced', () => {
    const sourceMap: Record<string, SourcedClaim[]> = {
      painPoints: [
        { claim: 'High load times', source: 'homepage', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'high' },
        { claim: 'Scaling issues', source: 'careers', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'medium' },
      ],
      financialSignals: [],
      competitiveLandscape: [],
      marketPosition: [],
      risks: [],
      keyPeople: [],
    }

    const report = {
      painPoints: [
        { title: 'High load times', description: '', evidence: '', severity: 'high' as const, confidence: 80 },
        { title: 'Scaling issues', description: '', evidence: '', severity: 'medium' as const, confidence: 70 },
      ],
    }

    const result = calculateSectionConfidence(report, sourceMap)
    const painSection = result.find(s => s.section === 'painPoints')

    expect(painSection).toBeDefined()
    expect(painSection!.score).toBe(100)
    expect(painSection!.sourcedClaimCount).toBe(2)
    expect(painSection!.claimCount).toBe(2)
  })

  it('scores 0% when all claims are inferred', () => {
    const sourceMap: Record<string, SourcedClaim[]> = {
      painPoints: [
        { claim: 'Guessed pain', source: 'inferred', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'inferred' },
      ],
      financialSignals: [],
      competitiveLandscape: [],
      marketPosition: [],
      risks: [],
      keyPeople: [],
    }

    const report = {
      painPoints: [
        { title: 'Guessed pain', description: '', evidence: '', severity: 'low' as const, confidence: 30 },
      ],
    }

    const result = calculateSectionConfidence(report, sourceMap)
    const painSection = result.find(s => s.section === 'painPoints')

    expect(painSection!.score).toBe(0)
    expect(painSection!.sourcedClaimCount).toBe(0)
  })

  it('handles mixed confidence levels', () => {
    const sourceMap: Record<string, SourcedClaim[]> = {
      painPoints: [],
      financialSignals: [
        { claim: 'Revenue data', source: 'pricing', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'high' },
        { claim: 'Guess on ARR', source: 'inferred', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'inferred' },
        { claim: 'Funding round', source: 'news', extractedAt: '2025-01-01T00:00:00.000Z', confidence: 'medium' },
      ],
      competitiveLandscape: [],
      marketPosition: [],
      risks: [],
      keyPeople: [],
    }

    const report = {
      financialSignals: {
        fundingStage: 'series-a',
        estimatedRevenue: '$5M',
        growthIndicators: [],
        hiringVelocity: 'moderate',
      },
    }

    const result = calculateSectionConfidence(report, sourceMap)
    const financialSection = result.find(s => s.section === 'financialSignals')

    expect(financialSection!.score).toBe(67) // 2 out of 3
    expect(financialSection!.sourcedClaimCount).toBe(2)
    expect(financialSection!.claimCount).toBe(3)
  })

  it('handles empty sourceMap gracefully', () => {
    const result = calculateSectionConfidence({}, {})
    expect(result).toHaveLength(6)
    result.forEach(s => {
      expect(s.score).toBe(0)
    })
  })

  it('covers all six sections', () => {
    const result = calculateSectionConfidence({}, {})
    const sections = result.map(s => s.section)
    expect(sections).toContain('painPoints')
    expect(sections).toContain('financialSignals')
    expect(sections).toContain('competitiveLandscape')
    expect(sections).toContain('marketPosition')
    expect(sections).toContain('risks')
    expect(sections).toContain('keyPeople')
  })
})

describe('getFreshnessColor', () => {
  it('returns green for fresh data (< 7 days)', () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const result = getFreshnessColor(recent)
    expect(result.label).toBe('Fresh')
    expect(result.text).toContain('emerald')
  })

  it('returns yellow for recent data (7-30 days)', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = getFreshnessColor(twoWeeksAgo)
    expect(result.label).toBe('Recent')
    expect(result.text).toContain('amber')
  })

  it('returns red for stale data (> 30 days)', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const result = getFreshnessColor(twoMonthsAgo)
    expect(result.label).toBe('Stale')
    expect(result.text).toContain('red')
  })
})

describe('analyzer sourceMap output structure', () => {
  it('validates sourceMap claim structure', () => {
    const claim: SourcedClaim = {
      claim: 'Test claim',
      source: 'homepage',
      extractedAt: new Date().toISOString(),
      confidence: 'high',
    }

    expect(claim.claim).toBe('Test claim')
    expect(claim.source).toBe('homepage')
    expect(claim.confidence).toBe('high')
    expect(new Date(claim.extractedAt).toISOString()).toBe(claim.extractedAt)
  })

  it('validates all confidence levels', () => {
    const levels = ['high', 'medium', 'low', 'inferred'] as const
    for (const level of levels) {
      const claim: SourcedClaim = {
        claim: `Claim at ${level}`,
        source: 'about',
        extractedAt: new Date().toISOString(),
        confidence: level,
      }
      expect(claim.confidence).toBe(level)
    }
  })
})
