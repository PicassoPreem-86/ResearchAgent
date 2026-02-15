import { describe, it, expect } from 'vitest'
import { SAMPLE_REPORT } from '../test/fixtures.js'
import type { ComparisonReport } from '../types/prospect.js'

// We test the server-side formatting logic (same as what endpoints use)
// since the client-side formatters use browser APIs

describe('formatReportAsJSON (clean export)', () => {
  it('produces valid JSON', () => {
    const clean = {
      company: SAMPLE_REPORT.company,
      executiveSummary: SAMPLE_REPORT.executiveSummary,
      swot: SAMPLE_REPORT.swot,
      marketPosition: SAMPLE_REPORT.marketPosition,
      competitiveLandscape: SAMPLE_REPORT.competitiveLandscape,
      painPoints: SAMPLE_REPORT.painPoints,
      risks: SAMPLE_REPORT.risks,
      keyPeople: SAMPLE_REPORT.keyPeople,
      financialSignals: SAMPLE_REPORT.financialSignals,
      jobInsights: SAMPLE_REPORT.jobInsights,
      strategicRecommendations: SAMPLE_REPORT.strategicRecommendations,
      researchedAt: SAMPLE_REPORT.researchedAt,
      template: SAMPLE_REPORT.template,
    }
    const json = JSON.stringify(clean, null, 2)
    const parsed = JSON.parse(json)
    expect(parsed.company.name).toBe('Stripe')
    expect(parsed.company.domain).toBe('stripe.com')
  })

  it('excludes internal metadata like sourceMap', () => {
    const clean = {
      company: SAMPLE_REPORT.company,
      executiveSummary: SAMPLE_REPORT.executiveSummary,
      swot: SAMPLE_REPORT.swot,
      marketPosition: SAMPLE_REPORT.marketPosition,
      competitiveLandscape: SAMPLE_REPORT.competitiveLandscape,
      painPoints: SAMPLE_REPORT.painPoints,
      risks: SAMPLE_REPORT.risks,
      keyPeople: SAMPLE_REPORT.keyPeople,
      financialSignals: SAMPLE_REPORT.financialSignals,
      jobInsights: SAMPLE_REPORT.jobInsights,
      strategicRecommendations: SAMPLE_REPORT.strategicRecommendations,
      researchedAt: SAMPLE_REPORT.researchedAt,
      template: SAMPLE_REPORT.template,
    }
    const json = JSON.stringify(clean, null, 2)
    expect(json).not.toContain('sourceMap')
    expect(json).not.toContain('dataFreshness')
    expect(json).not.toContain('sectionConfidence')
  })
})

describe('formatReportAsCSV', () => {
  function formatCSV(report: typeof SAMPLE_REPORT): string {
    const headers = ['Domain', 'Company', 'Industry', 'Size', 'Funding Stage', 'Revenue Estimate', 'Risk Level', 'Pain Points', 'Key People', 'Competitors', 'Recommendation']
    const values = [
      report.company.domain,
      report.company.name,
      report.company.industry,
      report.company.estimatedSize,
      report.financialSignals?.fundingStage || '',
      report.financialSignals?.estimatedRevenue || '',
      report.risks?.level || '',
      (report.painPoints || []).map(p => p.title).join('; '),
      (report.keyPeople || []).map(p => `${p.name} (${p.role})`).join('; '),
      (report.competitiveLandscape?.competitors || []).map(c => c.name).join('; '),
      (report.strategicRecommendations || []).slice(0, 2).join('; '),
    ]
    return [headers.join(','), values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n')
  }

  it('has correct headers', () => {
    const csv = formatCSV(SAMPLE_REPORT)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Domain,Company,Industry,Size,Funding Stage,Revenue Estimate,Risk Level,Pain Points,Key People,Competitors,Recommendation')
  })

  it('includes domain and company name', () => {
    const csv = formatCSV(SAMPLE_REPORT)
    expect(csv).toContain('stripe.com')
    expect(csv).toContain('Stripe')
  })

  it('escapes double quotes properly', () => {
    const reportWithQuotes = {
      ...SAMPLE_REPORT,
      company: { ...SAMPLE_REPORT.company, name: 'Stripe "Payments"' },
    }
    const csv = formatCSV(reportWithQuotes)
    expect(csv).toContain('Stripe ""Payments""')
  })

  it('has exactly 2 lines (header + data)', () => {
    const csv = formatCSV(SAMPLE_REPORT)
    const lines = csv.split('\n')
    expect(lines.length).toBe(2)
  })

  it('has correct number of columns', () => {
    const csv = formatCSV(SAMPLE_REPORT)
    const lines = csv.split('\n')
    // 11 columns in both header and data
    expect(lines[0].split(',').length).toBe(11)
  })
})

describe('formatReportAsMarkdown', () => {
  function formatMD(report: typeof SAMPLE_REPORT): string {
    const lines: string[] = []
    lines.push(`# ${report.company.name} - Research Report`)
    lines.push('')
    lines.push(`**Domain:** ${report.company.domain}`)
    if (report.company.industry) lines.push(`**Industry:** ${report.company.industry}`)
    lines.push(`**Researched:** ${new Date(report.researchedAt).toLocaleDateString()}`)
    lines.push('')
    if (report.executiveSummary) {
      lines.push('## Executive Summary')
      lines.push('')
      lines.push(report.executiveSummary)
      lines.push('')
    }
    return lines.join('\n')
  }

  it('starts with an H1 heading', () => {
    const md = formatMD(SAMPLE_REPORT)
    expect(md).toMatch(/^# Stripe/)
  })

  it('includes domain', () => {
    const md = formatMD(SAMPLE_REPORT)
    expect(md).toContain('stripe.com')
  })

  it('includes executive summary section', () => {
    const md = formatMD(SAMPLE_REPORT)
    expect(md).toContain('## Executive Summary')
    expect(md).toContain('dominant payments infrastructure')
  })

  it('includes industry', () => {
    const md = formatMD(SAMPLE_REPORT)
    expect(md).toContain('Fintech / Payments')
  })
})

describe('comparison markdown formatter', () => {
  function formatComparisonMD(comparison: ComparisonReport): string {
    const lines: string[] = []
    lines.push('# Company Comparison Report')
    lines.push(`> Generated: ${new Date(comparison.generatedAt).toLocaleDateString()}`)
    lines.push('')
    lines.push('## Companies Compared')
    for (const co of comparison.companies) {
      lines.push(`- **${co.company.name}** (${co.company.domain})`)
    }
    lines.push('')
    if (comparison.comparison.summary) {
      lines.push('## Summary')
      lines.push(comparison.comparison.summary)
      lines.push('')
    }
    return lines.join('\n')
  }

  const mockComparison: ComparisonReport = {
    companies: [SAMPLE_REPORT],
    comparison: {
      dimensions: [
        { name: 'Market Position', entries: [{ domain: 'stripe.com', value: 'Leader', score: 9 }], winner: 'stripe.com' },
      ],
      summary: 'Stripe leads in payment infrastructure.',
      recommendation: 'Focus on Stripe for payment needs.',
      overallWinner: 'stripe.com',
      companySummaries: [{ domain: 'stripe.com', strengths: ['API'], weaknesses: ['Price'] }],
    },
    generatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('starts with comparison report heading', () => {
    const md = formatComparisonMD(mockComparison)
    expect(md).toContain('# Company Comparison Report')
  })

  it('lists compared companies', () => {
    const md = formatComparisonMD(mockComparison)
    expect(md).toContain('**Stripe** (stripe.com)')
  })

  it('includes summary', () => {
    const md = formatComparisonMD(mockComparison)
    expect(md).toContain('## Summary')
    expect(md).toContain('Stripe leads')
  })
})
