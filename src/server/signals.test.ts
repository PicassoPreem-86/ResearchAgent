import { describe, it, expect } from 'vitest'
import { detectSignals } from './signals'

function makeReport(overrides: Record<string, any> = {}) {
  return {
    jobInsights: [
      { title: 'Engineer', department: 'Eng', inference: '' },
      { title: 'PM', department: 'Product', inference: '' },
    ],
    financialSignals: {
      fundingStage: 'Series A',
      estimatedRevenue: '$5M',
      growthIndicators: [],
      hiringVelocity: 'Medium',
    },
    keyPeople: [
      { name: 'Jane Doe', role: 'CEO', context: '' },
      { name: 'John Smith', role: 'CTO', context: '' },
    ],
    risks: {
      level: 'medium',
      flags: [{ title: 'Market risk', description: '', severity: 'medium' }],
    },
    competitiveLandscape: {
      competitors: [{ name: 'CompA', positioning: 'leader' }],
      moat: '',
      vulnerabilities: [],
    },
    ...overrides,
  }
}

describe('detectSignals', () => {
  it('detects hiring surge when jobs increase by 50%+ and delta >= 3', () => {
    const old = makeReport({ jobInsights: [{ title: 'A', department: 'Eng', inference: '' }, { title: 'B', department: 'Eng', inference: '' }] })
    const newer = makeReport({
      jobInsights: Array.from({ length: 6 }, (_, i) => ({ title: `Job${i}`, department: 'Eng', inference: '' })),
    })

    const signals = detectSignals('test.com', old, newer)
    const surge = signals.find(s => s.type === 'hiring_surge')

    expect(surge).toBeTruthy()
    expect(surge!.severity).toBe('notable')
    expect(surge!.title).toContain('test.com')
    expect(surge!.description).toContain('2')
    expect(surge!.description).toContain('6')
  })

  it('detects hiring slowdown when jobs drop below 50%', () => {
    const old = makeReport({
      jobInsights: Array.from({ length: 10 }, (_, i) => ({ title: `Job${i}`, department: 'Eng', inference: '' })),
    })
    const newer = makeReport({
      jobInsights: [{ title: 'Job0', department: 'Eng', inference: '' }],
    })

    const signals = detectSignals('test.com', old, newer)
    const slowdown = signals.find(s => s.type === 'hiring_slowdown')

    expect(slowdown).toBeTruthy()
    expect(slowdown!.severity).toBe('notable')
  })

  it('detects funding stage change', () => {
    const old = makeReport()
    const newer = makeReport({
      financialSignals: { ...old.financialSignals, fundingStage: 'Series B' },
    })

    const signals = detectSignals('test.com', old, newer)
    const funding = signals.find(s => s.type === 'new_funding')

    expect(funding).toBeTruthy()
    expect(funding!.severity).toBe('critical')
    expect(funding!.description).toContain('Series A')
    expect(funding!.description).toContain('Series B')
  })

  it('detects leadership change for C-level additions', () => {
    const old = makeReport()
    const newer = makeReport({
      keyPeople: [
        ...old.keyPeople,
        { name: 'Alice Walker', role: 'CFO', context: 'New hire' },
      ],
    })

    const signals = detectSignals('test.com', old, newer)
    const leadership = signals.find(s => s.type === 'leadership_change')

    expect(leadership).toBeTruthy()
    expect(leadership!.severity).toBe('notable')
    expect(leadership!.description).toContain('Alice Walker')
    expect(leadership!.description).toContain('CFO')
  })

  it('does not detect leadership change for non-executive additions', () => {
    const old = makeReport()
    const newer = makeReport({
      keyPeople: [
        ...old.keyPeople,
        { name: 'Bob Jones', role: 'Software Engineer', context: '' },
      ],
    })

    const signals = detectSignals('test.com', old, newer)
    const leadership = signals.find(s => s.type === 'leadership_change')

    expect(leadership).toBeUndefined()
  })

  it('detects risk escalation', () => {
    const old = makeReport({ risks: { level: 'low', flags: [] } })
    const newer = makeReport({ risks: { level: 'high', flags: [] } })

    const signals = detectSignals('test.com', old, newer)
    const escalation = signals.find(s => s.type === 'risk_escalation')

    expect(escalation).toBeTruthy()
    expect(escalation!.severity).toBe('critical')
    expect(escalation!.description).toContain('low')
    expect(escalation!.description).toContain('high')
  })

  it('detects risk resolved (improvement)', () => {
    const old = makeReport({ risks: { level: 'high', flags: [] } })
    const newer = makeReport({ risks: { level: 'low', flags: [] } })

    const signals = detectSignals('test.com', old, newer)
    const resolved = signals.find(s => s.type === 'risk_resolved')

    expect(resolved).toBeTruthy()
    expect(resolved!.severity).toBe('info')
  })

  it('detects new competitors when >= 2 appear', () => {
    const old = makeReport()
    const newer = makeReport({
      competitiveLandscape: {
        competitors: [
          { name: 'CompA', positioning: 'leader' },
          { name: 'CompB', positioning: 'challenger' },
          { name: 'CompC', positioning: 'niche' },
        ],
        moat: '',
        vulnerabilities: [],
      },
    })

    const signals = detectSignals('test.com', old, newer)
    const compSignal = signals.find(s => s.type === 'competitor_move')

    expect(compSignal).toBeTruthy()
    expect(compSignal!.severity).toBe('info')
    expect(compSignal!.description).toContain('CompB')
    expect(compSignal!.description).toContain('CompC')
  })

  it('does not detect competitor signal for < 2 new competitors', () => {
    const old = makeReport()
    const newer = makeReport({
      competitiveLandscape: {
        competitors: [
          { name: 'CompA', positioning: 'leader' },
          { name: 'CompB', positioning: 'challenger' },
        ],
        moat: '',
        vulnerabilities: [],
      },
    })

    const signals = detectSignals('test.com', old, newer)
    const compSignal = signals.find(s => s.type === 'competitor_move')

    expect(compSignal).toBeUndefined()
  })

  it('returns empty signals when no changes', () => {
    const report = makeReport()
    const signals = detectSignals('test.com', report, report)

    expect(signals).toHaveLength(0)
  })

  it('returns empty signals when both reports are empty', () => {
    const signals = detectSignals('test.com', {}, {})
    expect(signals).toHaveLength(0)
  })

  it('handles null/undefined reports gracefully', () => {
    const signals = detectSignals('test.com', null, null)
    expect(signals).toHaveLength(0)
  })

  it('all signals have required fields populated', () => {
    const old = makeReport({ risks: { level: 'low', flags: [] } })
    const newer = makeReport({
      risks: { level: 'high', flags: [] },
      financialSignals: { fundingStage: 'Series C', estimatedRevenue: '', growthIndicators: [], hiringVelocity: '' },
      jobInsights: Array.from({ length: 8 }, (_, i) => ({ title: `J${i}`, department: 'Eng', inference: '' })),
    })

    const signals = detectSignals('example.com', old, newer)

    for (const signal of signals) {
      expect(signal.id).toBeTruthy()
      expect(signal.type).toBeTruthy()
      expect(signal.severity).toMatch(/^(info|notable|critical)$/)
      expect(signal.title).toBeTruthy()
      expect(signal.description).toBeTruthy()
      expect(signal.domain).toBe('example.com')
      expect(signal.detectedAt).toBeTruthy()
      expect(signal.read).toBe(false)
    }
  })

  it('generates unique IDs for each signal', () => {
    const old = makeReport({ risks: { level: 'low', flags: [] } })
    const newer = makeReport({
      risks: { level: 'high', flags: [] },
      financialSignals: { fundingStage: 'Series C', estimatedRevenue: '', growthIndicators: [], hiringVelocity: '' },
    })

    const signals = detectSignals('test.com', old, newer)
    const ids = signals.map(s => s.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })
})
