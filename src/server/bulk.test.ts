import { describe, it, expect, vi } from 'vitest'

// Mock analyzer to avoid OpenAI instantiation at import time
vi.mock('./analyzer.js', () => ({
  analyzeCompany: vi.fn(),
}))

// Mock scraper to avoid network calls at import time
vi.mock('./scraper.js', () => ({
  scrapeCompany: vi.fn(),
}))

import { parseCsvDomains, generateCsv, type BulkResult } from './bulk.js'
import type { ProspectReport } from '../types/prospect.js'

describe('parseCsvDomains', () => {
  it('parses simple list of domains', () => {
    const csv = 'example.com\nacme.org\ntest.io'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org', 'test.io'])
  })

  it('strips protocol and trailing paths', () => {
    const csv = 'https://example.com/about\nhttp://acme.org/pricing'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('skips header rows', () => {
    const csv = 'Domain\nexample.com\nacme.org'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('handles multiple header keywords case-insensitively', () => {
    for (const header of ['URL', 'Website', 'Company', 'Name', 'domain']) {
      const csv = `${header}\nexample.com`
      expect(parseCsvDomains(csv)).toEqual(['example.com'])
    }
  })

  it('takes first column from CSV with multiple columns', () => {
    const csv = 'example.com,Acme Corp,Tech\nacme.org,Acme Inc,Finance'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('strips quotes around domains', () => {
    const csv = '"example.com"\n\'acme.org\''
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('deduplicates domains', () => {
    const csv = 'example.com\nexample.com\nacme.org'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('skips empty lines', () => {
    const csv = '\nexample.com\n\nacme.org\n'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('handles Windows-style line endings', () => {
    const csv = 'example.com\r\nacme.org\r\n'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('skips entries without a dot (not valid domains)', () => {
    const csv = 'example.com\njusttext\nacme.org'
    const domains = parseCsvDomains(csv)
    expect(domains).toEqual(['example.com', 'acme.org'])
  })

  it('returns empty array for empty input', () => {
    expect(parseCsvDomains('')).toEqual([])
  })
})

describe('generateCsv', () => {
  function makeReport(domain: string): ProspectReport {
    return {
      company: {
        name: 'Test Corp',
        domain,
        description: 'A test company',
        industry: 'Technology',
        estimatedSize: '50-100',
        techStack: [],
        recentNews: [],
        keyProducts: [],
        confidence: 0.9,
      },
      executiveSummary: 'Summary',
      painPoints: [
        { title: 'Scale', description: 'Need to scale', evidence: 'Hiring', severity: 'high', confidence: 0.8 },
      ],
      jobInsights: [],
      email: { subject: 'Hello', body: 'Dear team', personalizationNotes: [], tone: 'formal', variant: 'default' },
      emails: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      marketPosition: {
        segment: 'SaaS',
        pricingTier: 'mid',
        targetAudience: 'Enterprise',
        differentiators: [],
        marketMaturity: 'growing',
      },
      risks: { level: 'low', flags: [] },
      keyPeople: [],
      financialSignals: { fundingStage: 'Series B', estimatedRevenue: '$10M', growthIndicators: [], hiringVelocity: 'high' },
      competitiveLandscape: { competitors: [], moat: 'tech', vulnerabilities: [] },
      strategicRecommendations: [],
      template: 'general',
      researchedAt: new Date().toISOString(),
    }
  }

  it('produces valid CSV with headers', () => {
    const results: BulkResult[] = [
      { domain: 'example.com', status: 'success', report: makeReport('example.com') },
    ]
    const csv = generateCsv(results)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Company Name')
    expect(lines[0]).toContain('Domain')
    expect(lines[0]).toContain('Industry')
    expect(lines[0]).toContain('Email Subject')
    expect(lines.length).toBe(2)
  })

  it('includes data from successful reports', () => {
    const results: BulkResult[] = [
      { domain: 'example.com', status: 'success', report: makeReport('example.com') },
    ]
    const csv = generateCsv(results)
    expect(csv).toContain('Test Corp')
    expect(csv).toContain('example.com')
    expect(csv).toContain('Technology')
    expect(csv).toContain('Hello')
  })

  it('handles error results gracefully', () => {
    const results: BulkResult[] = [
      { domain: 'fail.com', status: 'error', error: 'Connection timeout' },
    ]
    const csv = generateCsv(results)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('fail.com')
    expect(lines[1]).toContain('error')
    expect(lines[1]).toContain('Connection timeout')
  })

  it('escapes CSV values containing commas', () => {
    const report = makeReport('example.com')
    report.company.description = 'We build things, quickly'
    const results: BulkResult[] = [{ domain: 'example.com', status: 'success', report }]
    const csv = generateCsv(results)
    expect(csv).toContain('"We build things, quickly"')
  })

  it('escapes CSV values containing double quotes', () => {
    const report = makeReport('example.com')
    report.company.description = 'The "best" company'
    const results: BulkResult[] = [{ domain: 'example.com', status: 'success', report }]
    const csv = generateCsv(results)
    expect(csv).toContain('"The ""best"" company"')
  })

  it('escapes CSV values containing newlines', () => {
    const report = makeReport('example.com')
    report.email.body = 'Line 1\nLine 2'
    const results: BulkResult[] = [{ domain: 'example.com', status: 'success', report }]
    const csv = generateCsv(results)
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it('handles mixed success and error results', () => {
    const results: BulkResult[] = [
      { domain: 'good.com', status: 'success', report: makeReport('good.com') },
      { domain: 'bad.com', status: 'error', error: 'Failed' },
      { domain: 'ok.com', status: 'success', report: makeReport('ok.com') },
    ]
    const csv = generateCsv(results)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(4) // header + 3 rows
  })

  it('produces empty CSV with only headers for no results', () => {
    const csv = generateCsv([])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(1) // header only
    expect(lines[0]).toContain('Company Name')
  })
})
