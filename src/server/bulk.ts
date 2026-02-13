import { scrapeCompany } from './scraper.js'
import { analyzeCompany } from './analyzer.js'
import type { ProspectReport } from '../types/prospect.js'

export interface BulkProgress {
  type: 'item_start' | 'item_progress' | 'item_complete' | 'item_error' | 'bulk_complete'
  index: number
  total: number
  domain: string
  message: string
  report?: ProspectReport
  results?: BulkResult[]
}

export interface BulkResult {
  domain: string
  status: 'success' | 'error'
  report?: ProspectReport
  error?: string
}

export function parseCsvDomains(csv: string): string[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const domains: string[] = []
  for (const line of lines) {
    // Take first column if comma-separated
    const cell = line.split(',')[0].trim()
    // Strip quotes
    const cleaned = cell.replace(/^["']|["']$/g, '').trim()
    // Skip header-like rows
    if (!cleaned || /^(domain|url|website|company|name)$/i.test(cleaned)) continue
    // Normalize: strip protocol and trailing path
    const domain = cleaned.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (domain && domain.includes('.')) {
      domains.push(domain)
    }
  }
  return [...new Set(domains)]
}

export async function processBulk(
  domains: string[],
  onProgress: (progress: BulkProgress) => Promise<void>,
  senderContext?: { name?: string; company?: string; role?: string }
): Promise<BulkResult[]> {
  const results: BulkResult[] = []
  const total = domains.length

  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i]

    await onProgress({
      type: 'item_start',
      index: i,
      total,
      domain,
      message: `Processing ${i + 1}/${total}: ${domain}`,
    })

    try {
      const scrapedData = await scrapeCompany(domain, async (msg) => {
        await onProgress({
          type: 'item_progress',
          index: i,
          total,
          domain,
          message: `[${i + 1}/${total}] ${domain}: ${msg}`,
        })
      })

      const report = await analyzeCompany(domain, scrapedData, senderContext)

      results.push({ domain, status: 'success', report })

      await onProgress({
        type: 'item_complete',
        index: i,
        total,
        domain,
        message: `Completed ${i + 1}/${total}: ${domain}`,
        report,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      results.push({ domain, status: 'error', error })

      await onProgress({
        type: 'item_error',
        index: i,
        total,
        domain,
        message: `Error ${i + 1}/${total}: ${domain} - ${error}`,
      })
    }
  }

  await onProgress({
    type: 'bulk_complete',
    index: total - 1,
    total,
    domain: '',
    message: `Bulk processing complete: ${results.filter((r) => r.status === 'success').length}/${total} succeeded`,
    results,
  })

  return results
}

export function generateCsv(results: BulkResult[]): string {
  const headers = [
    'Company Name',
    'Domain',
    'Industry',
    'Estimated Size',
    'Description',
    'Pain Points',
    'Email Subject',
    'Email Body',
    'Status',
    'Error',
  ]

  const escCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"'
    }
    return val
  }

  const rows = results.map((r) => {
    if (r.status === 'error' || !r.report) {
      return [
        '',
        r.domain,
        '',
        '',
        '',
        '',
        '',
        '',
        'error',
        r.error || 'Unknown error',
      ].map(escCsv)
    }

    const report = r.report
    const painPoints = report.painPoints.map((p) => `${p.title}: ${p.description}`).join('; ')

    return [
      report.company.name,
      report.company.domain,
      report.company.industry,
      report.company.estimatedSize,
      report.company.description,
      painPoints,
      report.email.subject,
      report.email.body,
      'success',
      '',
    ].map(escCsv)
  })

  return [headers.map(escCsv).join(','), ...rows.map((row) => row.join(','))].join('\n')
}
