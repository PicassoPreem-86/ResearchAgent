import { describe, it, expect } from 'vitest'
import {
  reportToRadarScores,
  calculateProductMaturity,
  calculateMarketPresence,
  calculateTeamStrength,
  calculateFinancialHealth,
  calculateGrowthVelocity,
  calculateInnovation,
  competitorsToMapData,
  reportsToTimelineData,
} from './chartHelpers'
import { SAMPLE_REPORT } from '../test/fixtures'
import type { ProspectReport } from '../types/prospect'

function makeMinimalReport(overrides: Partial<ProspectReport> = {}): ProspectReport {
  return {
    company: { name: 'Test', domain: 'test.com', description: '', industry: '', estimatedSize: '', techStack: [], recentNews: [], keyProducts: [], confidence: 50 },
    executiveSummary: '',
    painPoints: [],
    jobInsights: [],
    email: { subject: '', body: '', personalizationNotes: [], tone: 'casual', variant: '' },
    emails: [],
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    marketPosition: { segment: '', pricingTier: '', targetAudience: '', differentiators: [], marketMaturity: 'early' },
    risks: { level: 'low', flags: [] },
    keyPeople: [],
    financialSignals: { fundingStage: '', estimatedRevenue: '', growthIndicators: [], hiringVelocity: '' },
    competitiveLandscape: { competitors: [], moat: '', vulnerabilities: [] },
    strategicRecommendations: [],
    template: 'general',
    researchedAt: '2025-01-01T00:00:00.000Z',
    sourceMap: {},
    dataFreshness: { oldestSource: '', newestSource: '', sources: [], totalPagesFetched: 0, totalPagesSuccessful: 0 },
    sectionConfidence: [],
    ...overrides,
  }
}

describe('reportToRadarScores', () => {
  it('produces 6 dimensions with valid 0-100 scores', () => {
    const scores = reportToRadarScores(SAMPLE_REPORT)
    expect(scores).toHaveLength(6)
    scores.forEach((s) => {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
      expect(s.fullMark).toBe(100)
      expect(s.dimension).toBeTruthy()
    })
  })

  it('works with minimal/empty report data', () => {
    const minimal = makeMinimalReport()
    const scores = reportToRadarScores(minimal)
    expect(scores).toHaveLength(6)
    scores.forEach((s) => {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
    })
  })

  it('returns expected dimension names', () => {
    const scores = reportToRadarScores(SAMPLE_REPORT)
    const dims = scores.map((s) => s.dimension)
    expect(dims).toContain('Product Maturity')
    expect(dims).toContain('Market Presence')
    expect(dims).toContain('Team Strength')
    expect(dims).toContain('Financial Health')
    expect(dims).toContain('Growth Velocity')
    expect(dims).toContain('Innovation')
  })
})

describe('calculateProductMaturity', () => {
  it('returns higher score for mature market position', () => {
    const mature = makeMinimalReport({ marketPosition: { segment: 'SaaS', pricingTier: 'premium', targetAudience: '', differentiators: ['a', 'b', 'c', 'd'], marketMaturity: 'mature' } })
    const early = makeMinimalReport({ marketPosition: { segment: 'SaaS', pricingTier: 'basic', targetAudience: '', differentiators: [], marketMaturity: 'early' } })
    expect(calculateProductMaturity(mature)).toBeGreaterThan(calculateProductMaturity(early))
  })

  it('never exceeds 100', () => {
    const maxed = makeMinimalReport({
      marketPosition: { segment: 'SaaS', pricingTier: 'enterprise', targetAudience: '', differentiators: ['a', 'b', 'c', 'd', 'e', 'f'], marketMaturity: 'mature' },
      company: { ...SAMPLE_REPORT.company, keyProducts: ['a', 'b', 'c', 'd', 'e'] },
    })
    expect(calculateProductMaturity(maxed)).toBeLessThanOrEqual(100)
  })
})

describe('calculateMarketPresence', () => {
  it('increases with more competitors and moat', () => {
    const withData = makeMinimalReport({
      competitiveLandscape: {
        competitors: [
          { name: 'A', positioning: 'test' },
          { name: 'B', positioning: 'test' },
          { name: 'C', positioning: 'test' },
        ],
        moat: 'Strong brand',
        vulnerabilities: [],
      },
      marketPosition: { segment: 'Payments', pricingTier: '', targetAudience: 'B2B', differentiators: [], marketMaturity: 'growing' },
    })
    const withoutData = makeMinimalReport()
    expect(calculateMarketPresence(withData)).toBeGreaterThan(calculateMarketPresence(withoutData))
  })
})

describe('calculateTeamStrength', () => {
  it('scores higher with C-suite members', () => {
    const withLeadership = makeMinimalReport({
      keyPeople: [
        { name: 'Alice', role: 'CEO', context: '' },
        { name: 'Bob', role: 'CTO', context: '' },
        { name: 'Carol', role: 'CFO', context: '' },
      ],
    })
    const withoutLeadership = makeMinimalReport({
      keyPeople: [
        { name: 'Dave', role: 'Engineer', context: '' },
      ],
    })
    expect(calculateTeamStrength(withLeadership)).toBeGreaterThan(calculateTeamStrength(withoutLeadership))
  })

  it('handles empty keyPeople', () => {
    const empty = makeMinimalReport({ keyPeople: [] })
    const score = calculateTeamStrength(empty)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('calculateFinancialHealth', () => {
  it('scores higher for later funding stages', () => {
    const late = makeMinimalReport({ financialSignals: { fundingStage: 'Series C', estimatedRevenue: '$100M', growthIndicators: ['fast', 'expanding'], hiringVelocity: 'high' } })
    const early = makeMinimalReport({ financialSignals: { fundingStage: 'seed', estimatedRevenue: '', growthIndicators: [], hiringVelocity: '' } })
    expect(calculateFinancialHealth(late)).toBeGreaterThan(calculateFinancialHealth(early))
  })

  it('handles missing financialSignals', () => {
    const noSignals = makeMinimalReport({ financialSignals: undefined as unknown as ProspectReport['financialSignals'] })
    const score = calculateFinancialHealth(noSignals)
    expect(score).toBe(30)
  })
})

describe('calculateGrowthVelocity', () => {
  it('scores higher with high hiring velocity', () => {
    const highGrowth = makeMinimalReport({
      financialSignals: { fundingStage: '', estimatedRevenue: '', growthIndicators: ['rapid', 'accelerating'], hiringVelocity: 'High - 150+ open positions' },
      jobInsights: [
        { title: 'Eng 1', department: 'Eng', inference: '' },
        { title: 'Eng 2', department: 'Eng', inference: '' },
        { title: 'Eng 3', department: 'Eng', inference: '' },
      ],
    })
    const lowGrowth = makeMinimalReport({
      financialSignals: { fundingStage: '', estimatedRevenue: '', growthIndicators: [], hiringVelocity: 'Low' },
    })
    expect(calculateGrowthVelocity(highGrowth)).toBeGreaterThan(calculateGrowthVelocity(lowGrowth))
  })
})

describe('calculateInnovation', () => {
  it('scores higher with larger tech stack and differentiators', () => {
    const innovative = makeMinimalReport({
      company: { ...SAMPLE_REPORT.company, techStack: ['React', 'Go', 'K8s', 'TF', 'Rust'], keyProducts: ['P1', 'P2', 'P3'] },
      marketPosition: { segment: '', pricingTier: '', targetAudience: '', differentiators: ['AI-first', 'Real-time', 'Edge'], marketMaturity: 'growing' },
      swot: { strengths: [], weaknesses: [], opportunities: [{ title: 'AI', description: '', evidence: '' }], threats: [] },
    })
    const basic = makeMinimalReport()
    expect(calculateInnovation(innovative)).toBeGreaterThan(calculateInnovation(basic))
  })
})

describe('competitorsToMapData', () => {
  it('transforms competitor data correctly', () => {
    const company = { name: 'TestCo', domain: 'test.com' }
    const competitors = [
      { name: 'CompA', positioning: 'Enterprise leader in payments' },
      { name: 'CompB', positioning: 'Emerging startup in fintech' },
    ]
    const market = { segment: 'Payments', pricingTier: 'premium', marketMaturity: 'growing' }
    const result = competitorsToMapData(company, competitors, market)

    expect(result).toHaveLength(3)
    const target = result.find((p) => p.isTarget)
    expect(target).toBeTruthy()
    expect(target!.name).toBe('TestCo')
    expect(target!.size).toBeGreaterThan(100)

    const nonTargets = result.filter((p) => !p.isTarget)
    expect(nonTargets).toHaveLength(2)
    nonTargets.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(5)
      expect(p.x).toBeLessThanOrEqual(95)
      expect(p.y).toBeGreaterThanOrEqual(5)
      expect(p.y).toBeLessThanOrEqual(95)
    })
  })

  it('handles empty competitors list', () => {
    const result = competitorsToMapData({ name: 'Solo' }, [], undefined)
    expect(result).toHaveLength(1)
    expect(result[0].isTarget).toBe(true)
  })

  it('handles missing marketPosition', () => {
    const result = competitorsToMapData(
      { name: 'TestCo' },
      [{ name: 'Rival', positioning: 'growing startup' }],
      undefined
    )
    expect(result).toHaveLength(2)
    result.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('reportsToTimelineData', () => {
  it('transforms report history correctly', () => {
    const reports = [
      { researchedAt: '2025-03-01T00:00:00Z', confidence: 80, riskLevel: 'low', painPointCount: 3, jobCount: 5 },
      { researchedAt: '2025-01-01T00:00:00Z', confidence: 60, riskLevel: 'high', painPointCount: 5, jobCount: 2 },
      { researchedAt: '2025-02-01T00:00:00Z', confidence: 70, riskLevel: 'medium', painPointCount: 4, jobCount: 3 },
    ]
    const result = reportsToTimelineData(reports)

    expect(result).toHaveLength(3)
    // Should be sorted chronologically
    expect(result[0].confidence).toBe(60)
    expect(result[1].confidence).toBe(70)
    expect(result[2].confidence).toBe(80)
  })

  it('handles empty array', () => {
    expect(reportsToTimelineData([])).toEqual([])
  })

  it('handles missing optional fields', () => {
    const reports = [
      { researchedAt: '2025-01-01T00:00:00Z' },
      { researchedAt: '2025-02-01T00:00:00Z', confidence: 50 },
    ]
    const result = reportsToTimelineData(reports)
    expect(result).toHaveLength(2)
    expect(result[0].confidence).toBe(0)
    expect(result[0].riskLevel).toBe(0)
    expect(result[1].confidence).toBe(50)
  })

  it('maps risk levels to numeric scores', () => {
    const reports = [
      { researchedAt: '2025-01-01T00:00:00Z', riskLevel: 'low' },
      { researchedAt: '2025-02-01T00:00:00Z', riskLevel: 'medium' },
      { researchedAt: '2025-03-01T00:00:00Z', riskLevel: 'high' },
    ]
    const result = reportsToTimelineData(reports)
    expect(result[0].riskLevel).toBe(25)
    expect(result[1].riskLevel).toBe(50)
    expect(result[2].riskLevel).toBe(75)
  })
})
