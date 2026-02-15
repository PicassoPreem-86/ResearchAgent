import { describe, it, expect } from 'vitest'
import { compareReports } from './diff'
import type { ProspectReport } from '../types/prospect'

function makeReport(overrides: Partial<ProspectReport> = {}): Partial<ProspectReport> {
  return {
    executiveSummary: 'A technology company focused on AI.',
    painPoints: [
      { title: 'Scaling issues', description: 'Difficulty scaling infrastructure', evidence: 'Job postings', severity: 'high', confidence: 0.8 },
      { title: 'Talent retention', description: 'High turnover', evidence: 'Glassdoor', severity: 'medium', confidence: 0.6 },
    ],
    risks: {
      level: 'medium',
      flags: [
        { title: 'Market concentration', description: 'Over-reliance on single market', severity: 'medium' },
      ],
    },
    keyPeople: [
      { name: 'Jane Doe', role: 'CEO', context: 'Founded in 2020' },
      { name: 'John Smith', role: 'CTO', context: 'Ex-Google' },
    ],
    financialSignals: {
      fundingStage: 'Series A',
      estimatedRevenue: '$5M ARR',
      growthIndicators: ['Hiring rapidly'],
      hiringVelocity: 'High',
    },
    jobInsights: [
      { title: 'Senior Engineer', department: 'Engineering', inference: 'Growing team' },
      { title: 'Product Manager', department: 'Product', inference: 'New product line' },
    ],
    competitiveLandscape: {
      competitors: [
        { name: 'CompetitorA', positioning: 'Market leader' },
      ],
      moat: 'Proprietary data',
      vulnerabilities: ['Small team'],
    },
    strategicRecommendations: ['Expand to Europe', 'Hire VP Sales'],
    ...overrides,
  }
}

describe('compareReports', () => {
  it('returns no changes for identical reports', () => {
    const report = makeReport()
    const result = compareReports(report, report, 'example.com')

    expect(result.domain).toBe('example.com')
    expect(result.changesDetected).toBe(0)
    expect(result.changes).toHaveLength(0)
    expect(result.significance).toBe('none')
    expect(result.summary).toBe('No significant changes detected.')
    expect(result.checkedAt).toBeTruthy()
  })

  it('detects new pain points', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      painPoints: [
        ...oldReport.painPoints!,
        { title: 'Security concerns', description: 'Lax security posture', evidence: 'Public disclosure', severity: 'high', confidence: 0.9 },
      ],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    expect(result.changesDetected).toBeGreaterThan(0)
    const newPain = result.changes.find(
      (c) => c.type === 'new_info' && c.section === 'painPoints' && c.field === 'Security concerns'
    )
    expect(newPain).toBeTruthy()
    expect(newPain!.description).toBe('New pain point: Security concerns')
  })

  it('detects removed pain points', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      painPoints: [oldReport.painPoints![0]],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const removed = result.changes.find(
      (c) => c.type === 'removed_info' && c.section === 'painPoints' && c.field === 'Talent retention'
    )
    expect(removed).toBeTruthy()
  })

  it('detects new risks', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      risks: {
        level: 'high',
        flags: [
          ...oldReport.risks!.flags,
          { title: 'Regulatory threat', description: 'New compliance requirement', severity: 'high' },
        ],
      },
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const newRisk = result.changes.find((c) => c.type === 'new_risk' && c.field === 'Regulatory threat')
    expect(newRisk).toBeTruthy()
    expect(result.significance).toBe('major')
  })

  it('detects resolved risks', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      risks: { level: 'low', flags: [] },
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const resolved = result.changes.find(
      (c) => c.type === 'resolved_risk' && c.field === 'Market concentration'
    )
    expect(resolved).toBeTruthy()
  })

  it('detects hiring changes when delta >= 3', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      jobInsights: [
        { title: 'Senior Engineer', department: 'Engineering', inference: 'Growing' },
        { title: 'Product Manager', department: 'Product', inference: 'Expanding' },
        { title: 'Designer', department: 'Design', inference: 'New' },
        { title: 'DevOps', department: 'Infra', inference: 'Scaling' },
        { title: 'Data Scientist', department: 'Data', inference: 'AI focus' },
      ],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const hiring = result.changes.find((c) => c.type === 'hiring_change')
    expect(hiring).toBeTruthy()
    expect(hiring!.oldValue).toBe('2')
    expect(hiring!.newValue).toBe('5')
    expect(hiring!.description).toContain('Hiring surge')
    expect(result.significance).toBe('major')
  })

  it('does not flag hiring change when delta < 3', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      jobInsights: [
        { title: 'Senior Engineer', department: 'Engineering', inference: 'Growing' },
        { title: 'Product Manager', department: 'Product', inference: 'Expanding' },
        { title: 'Designer', department: 'Design', inference: 'New' },
      ],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const hiring = result.changes.find((c) => c.type === 'hiring_change')
    expect(hiring).toBeUndefined()
  })

  it('detects funding stage changes', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      financialSignals: {
        fundingStage: 'Series B',
        estimatedRevenue: '$15M ARR',
        growthIndicators: ['Expanding internationally'],
        hiringVelocity: 'Very High',
      },
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const funding = result.changes.find(
      (c) => c.type === 'changed_value' && c.field === 'fundingStage'
    )
    expect(funding).toBeTruthy()
    expect(funding!.oldValue).toBe('Series A')
    expect(funding!.newValue).toBe('Series B')
    expect(result.significance).toBe('major')
  })

  it('detects new competitors', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      competitiveLandscape: {
        competitors: [
          { name: 'CompetitorA', positioning: 'Market leader' },
          { name: 'CompetitorB', positioning: 'Emerging player' },
        ],
        moat: 'Proprietary data',
        vulnerabilities: ['Small team'],
      },
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const newComp = result.changes.find(
      (c) => c.type === 'competitor_change' && c.field === 'CompetitorB'
    )
    expect(newComp).toBeTruthy()
  })

  it('detects executive summary change', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      executiveSummary: 'A completely different summary about the company pivoting to B2B.',
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const summaryChange = result.changes.find(
      (c) => c.section === 'executiveSummary'
    )
    expect(summaryChange).toBeTruthy()
  })

  it('scores significance as major with >= 5 minor changes', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      executiveSummary: 'Changed summary',
      painPoints: [
        { title: 'New Pain 1', description: 'd', evidence: 'e', severity: 'low', confidence: 0.5 },
        { title: 'New Pain 2', description: 'd', evidence: 'e', severity: 'low', confidence: 0.5 },
      ],
      keyPeople: [
        { name: 'New Person 1', role: 'VP', context: 'Hired recently' },
        { name: 'New Person 2', role: 'Director', context: 'Lateral move' },
      ],
      strategicRecommendations: ['Pivot to enterprise'],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    expect(result.changesDetected).toBeGreaterThanOrEqual(5)
    expect(result.significance).toBe('major')
  })

  it('scores significance as minor with 1-4 non-critical changes', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      executiveSummary: 'Slightly updated executive summary.',
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    expect(result.changesDetected).toBe(1)
    expect(result.significance).toBe('minor')
  })

  it('handles empty/null reports gracefully', () => {
    const result = compareReports({}, {}, 'empty.com')

    expect(result.domain).toBe('empty.com')
    expect(result.changesDetected).toBe(0)
    expect(result.significance).toBe('none')
  })

  it('handles one empty report and one populated report', () => {
    const populated = makeReport()
    const result = compareReports({}, populated, 'new.com')

    expect(result.changesDetected).toBeGreaterThan(0)
    expect(result.changes.some((c) => c.section === 'painPoints')).toBe(true)
    expect(result.changes.some((c) => c.section === 'risks')).toBe(true)
    expect(result.changes.some((c) => c.section === 'keyPeople')).toBe(true)
  })

  it('formats summary with truncation for many changes', () => {
    const oldReport = makeReport()
    const newReport = makeReport({
      executiveSummary: 'Changed',
      painPoints: [
        { title: 'P1', description: 'd', evidence: 'e', severity: 'high', confidence: 0.9 },
        { title: 'P2', description: 'd', evidence: 'e', severity: 'high', confidence: 0.9 },
      ],
      risks: { level: 'high', flags: [{ title: 'R1', description: 'd', severity: 'high' }] },
      keyPeople: [{ name: 'New CEO', role: 'CEO', context: '' }],
      competitiveLandscape: {
        competitors: [{ name: 'NewComp', positioning: 'challenger' }],
        moat: '',
        vulnerabilities: [],
      },
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    expect(result.summary).toContain('and')
    expect(result.summary).toContain('more')
  })

  it('detects hiring slowdown', () => {
    const oldReport = makeReport({
      jobInsights: [
        { title: 'A', department: 'Eng', inference: '' },
        { title: 'B', department: 'Eng', inference: '' },
        { title: 'C', department: 'Eng', inference: '' },
        { title: 'D', department: 'Eng', inference: '' },
        { title: 'E', department: 'Eng', inference: '' },
      ],
    })
    const newReport = makeReport({
      jobInsights: [
        { title: 'A', department: 'Eng', inference: '' },
      ],
    })

    const result = compareReports(oldReport, newReport, 'example.com')

    const hiring = result.changes.find((c) => c.type === 'hiring_change')
    expect(hiring).toBeTruthy()
    expect(hiring!.description).toContain('Hiring slowdown')
  })
})
