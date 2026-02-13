// Load .env FIRST before any other imports that use env vars
import 'dotenv/config'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { streamSSE } from 'hono/streaming'
import { scrapeCompany } from './scraper.js'
import { analyzeCompany, generateComparison } from './analyzer.js'
import { parseCsvDomains, processBulk, generateCsv } from './bulk.js'
import { saveReport, getHistory, deleteReport } from './history.js'
import { generatePdf, generateComparisonPdf } from './pdf.js'
import { discoverByICP, discoverLookalike, discoverByKeywords } from './discover.js'
import { saveICP, loadICP } from './icp.js'
import { searchTalent } from './talent.js'
import type { ResearchProgress, EmailTone, SellerContext, ReportTemplate, ProspectReport, ComparisonReport, ICP, DiscoverResults, TalentReport } from '../types/prospect.js'

const app = new Hono()

app.use('*', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Non-streaming research endpoint
app.post('/api/research', async (c) => {
  try {
    const body = await c.req.json<{
      domain: string
      senderContext?: { name?: string; company?: string; role?: string }
      tone?: EmailTone
      sellerContext?: SellerContext
      template?: ReportTemplate
    }>()

    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    const domain = body.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    const scrapedData = await scrapeCompany(domain)
    const report = await analyzeCompany(domain, scrapedData, body.senderContext, undefined, body.tone, body.sellerContext, body.template)

    saveReport(report)

    return c.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// SSE streaming research endpoint
app.post('/api/research/stream', async (c) => {
  try {
    const body = await c.req.json<{
      domain: string
      senderContext?: { name?: string; company?: string; role?: string }
      tone?: EmailTone
      sellerContext?: SellerContext
      template?: ReportTemplate
    }>()

    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    const domain = body.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    return streamSSE(c, async (stream) => {
      const sendEvent = async (data: ResearchProgress) => {
        await stream.writeSSE({ data: JSON.stringify(data), event: 'progress' })
      }

      try {
        // Stage 1: Scraping
        await sendEvent({ stage: 'scraping', message: 'Analyzing homepage...', progress: 10 })

        const scrapedData = await scrapeCompany(domain, async (msg) => {
          const progressMap: Record<string, number> = {
            'Fetching homepage...': 10,
            'Scanning about page...': 20,
            'Scanning careers page...': 30,
          }
          await sendEvent({
            stage: 'scraping',
            message: msg,
            progress: progressMap[msg] || 25,
          })
        }, async (detail) => {
          await stream.writeSSE({
            data: JSON.stringify(detail),
            event: 'scrape_detail',
          })
        })

        // Stage 2: Analyzing
        await sendEvent({ stage: 'analyzing', message: 'Processing company data...', progress: 40 })

        // Stage 3: Jobs analysis
        if (scrapedData.jobListings.length > 0) {
          await sendEvent({
            stage: 'jobs',
            message: `Found ${scrapedData.jobListings.length} job listings, analyzing patterns...`,
            progress: 55,
          })
        } else {
          await sendEvent({ stage: 'jobs', message: 'No job listings found, inferring priorities...', progress: 55 })
        }

        // Stage 4: Generating
        await sendEvent({ stage: 'generating', message: 'Crafting personalized outreach...', progress: 75 })

        const report = await analyzeCompany(domain, scrapedData, body.senderContext, async (msg) => {
          await sendEvent({ stage: 'generating', message: msg, progress: 80 })
        }, body.tone, body.sellerContext, body.template)

        saveReport(report)

        // Stage 5: Complete
        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'complete' as const,
            message: 'Research complete',
            progress: 100,
            data: report,
          }),
          event: 'progress',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'error' as const,
            message,
            progress: 0,
          }),
          event: 'progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Bulk research endpoint (SSE streaming)
app.post('/api/research/bulk', async (c) => {
  try {
    const body = await c.req.json<{
      domains?: string[]
      csv?: string
      senderContext?: { name?: string; company?: string; role?: string }
    }>()

    let domains: string[] = []

    if (body.domains && Array.isArray(body.domains)) {
      domains = body.domains.map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    } else if (body.csv) {
      domains = parseCsvDomains(body.csv)
    }

    if (domains.length === 0) {
      return c.json({ error: 'No valid domains provided. Send "domains" array or "csv" string.' }, 400)
    }

    if (domains.length > 100) {
      return c.json({ error: 'Maximum 100 domains per batch' }, 400)
    }

    return streamSSE(c, async (stream) => {
      try {
        await processBulk(domains, async (progress) => {
          await stream.writeSSE({ data: JSON.stringify(progress), event: 'bulk_progress' })
        }, body.senderContext)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({ type: 'error', message }),
          event: 'bulk_progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Multi-company comparison endpoint (SSE streaming)
app.post('/api/research/compare', async (c) => {
  try {
    const body = await c.req.json<{
      domains: string[]
      template?: ReportTemplate
      senderContext?: { name?: string; company?: string; role?: string }
      tone?: EmailTone
      sellerContext?: SellerContext
    }>()

    if (!body.domains || !Array.isArray(body.domains) || body.domains.length === 0) {
      return c.json({ error: 'domains array is required' }, 400)
    }

    if (body.domains.length > 5) {
      return c.json({ error: 'Maximum 5 companies for comparison' }, 400)
    }

    const domains = body.domains.map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))

    return streamSSE(c, async (stream) => {
      const sendProgress = async (message: string, progress: number) => {
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'analyzing', message, progress }),
          event: 'progress',
        })
      }

      try {
        const reports = []
        const total = domains.length

        for (let i = 0; i < total; i++) {
          const domain = domains[i]
          await sendProgress(`Researching ${domain} (${i + 1}/${total})...`, Math.round(((i) / (total + 1)) * 100))

          const scrapedData = await scrapeCompany(domain)
          const report = await analyzeCompany(
            domain,
            scrapedData,
            body.senderContext,
            undefined,
            body.tone,
            body.sellerContext,
            body.template
          )
          saveReport(report)
          reports.push(report)

          await sendProgress(`Completed ${domain} (${i + 1}/${total})`, Math.round(((i + 1) / (total + 1)) * 100))
        }

        await sendProgress('Generating comparison...', Math.round((total / (total + 1)) * 100))
        const comparisonReport = await generateComparison(reports)

        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'complete',
            message: 'Comparison complete',
            progress: 100,
            data: comparisonReport,
          }),
          event: 'progress',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'error', message, progress: 0 }),
          event: 'progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Export bulk results as CSV
app.post('/api/research/export', async (c) => {
  try {
    const body = await c.req.json<{ results: Array<{ domain: string; status: string; report?: unknown; error?: string }> }>()

    if (!body.results || !Array.isArray(body.results)) {
      return c.json({ error: 'results array is required' }, 400)
    }

    const csv = generateCsv(body.results as Parameters<typeof generateCsv>[0])

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="prospect-research.csv"',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// PDF export endpoint - single report
app.post('/api/export/pdf', async (c) => {
  try {
    const report = await c.req.json<ProspectReport>()

    if (!report.company || !report.company.name) {
      return c.json({ error: 'Valid ProspectReport is required' }, 400)
    }

    const pdfBuffer = await generatePdf(report)
    const body = new Uint8Array(pdfBuffer)

    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.company.domain}-report.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// PDF export endpoint - comparison report
app.post('/api/export/comparison-pdf', async (c) => {
  try {
    const comparison = await c.req.json<ComparisonReport>()

    if (!comparison.companies || !comparison.comparison) {
      return c.json({ error: 'Valid ComparisonReport is required' }, 400)
    }

    const pdfBuffer = await generateComparisonPdf(comparison)
    const body = new Uint8Array(pdfBuffer)

    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="comparison-report.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// History endpoints
app.get('/api/history', (c) => {
  try {
    const history = getHistory()
    return c.json(history)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.delete('/api/history/:domain', (c) => {
  try {
    const domain = c.req.param('domain')
    const deleted = deleteReport(domain)
    if (!deleted) {
      return c.json({ error: 'Report not found' }, 404)
    }
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// --- ICP endpoints ---

app.get('/api/icp', (c) => {
  try {
    const icp = loadICP()
    return c.json(icp || null)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/icp', async (c) => {
  try {
    const icp = await c.req.json<ICP>()
    if (!icp.industries && !icp.keywords) {
      return c.json({ error: 'ICP must have at least industries or keywords' }, 400)
    }
    saveICP({
      industries: icp.industries || [],
      sizeRange: icp.sizeRange || '',
      techStack: icp.techStack || [],
      keywords: icp.keywords || [],
      geography: icp.geography || '',
      fundingStage: icp.fundingStage || '',
    })
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// --- Discover endpoints ---

app.post('/api/discover/icp', async (c) => {
  try {
    const body = await c.req.json<{ icp: ICP }>()
    if (!body.icp) {
      return c.json({ error: 'icp object is required' }, 400)
    }

    const companies = await discoverByICP(body.icp)

    const result: DiscoverResults = {
      query: `ICP: ${body.icp.industries.join(', ')} ${body.icp.keywords.join(', ')}`.trim(),
      icp: body.icp,
      companies,
      generatedAt: new Date().toISOString(),
    }

    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/icp/stream', async (c) => {
  try {
    const body = await c.req.json<{ icp: ICP }>()
    if (!body.icp) {
      return c.json({ error: 'icp object is required' }, 400)
    }

    return streamSSE(c, async (stream) => {
      try {
        const companies = await discoverByICP(body.icp, async (msg) => {
          await stream.writeSSE({
            data: JSON.stringify({ stage: 'analyzing', message: msg, progress: 50 }),
            event: 'progress',
          })
        })

        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'complete',
            message: 'Discovery complete',
            progress: 100,
            data: {
              query: `ICP: ${body.icp.industries.join(', ')} ${body.icp.keywords.join(', ')}`.trim(),
              icp: body.icp,
              companies,
              generatedAt: new Date().toISOString(),
            } satisfies DiscoverResults,
          }),
          event: 'progress',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'error', message, progress: 0 }),
          event: 'progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/lookalike', async (c) => {
  try {
    const body = await c.req.json<{ domain: string }>()
    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    const domain = body.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const companies = await discoverLookalike(domain)

    const result: DiscoverResults = {
      query: `Similar to ${domain}`,
      referenceDomain: domain,
      companies,
      generatedAt: new Date().toISOString(),
    }

    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/lookalike/stream', async (c) => {
  try {
    const body = await c.req.json<{ domain: string }>()
    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    const domain = body.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    return streamSSE(c, async (stream) => {
      try {
        const companies = await discoverLookalike(domain, async (msg) => {
          const progressMap: Record<string, number> = {
            'Researching reference company...': 15,
            'Extracting key attributes...': 30,
            'Searching for similar companies...': 50,
          }
          const progress = progressMap[msg] || 60
          await stream.writeSSE({
            data: JSON.stringify({ stage: 'analyzing', message: msg, progress }),
            event: 'progress',
          })
        })

        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'complete',
            message: 'Discovery complete',
            progress: 100,
            data: {
              query: `Similar to ${domain}`,
              referenceDomain: domain,
              companies,
              generatedAt: new Date().toISOString(),
            } satisfies DiscoverResults,
          }),
          event: 'progress',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'error', message, progress: 0 }),
          event: 'progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/search', async (c) => {
  try {
    const body = await c.req.json<{ keywords: string[]; filters?: Partial<ICP> }>()
    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return c.json({ error: 'keywords array is required' }, 400)
    }

    const companies = await discoverByKeywords(body.keywords, body.filters)

    const result: DiscoverResults = {
      query: body.keywords.join(', '),
      companies,
      generatedAt: new Date().toISOString(),
    }

    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// --- Talent endpoints ---

app.post('/api/talent/search', async (c) => {
  try {
    const body = await c.req.json<{ targetRole: string; targetSkills: string[]; location?: string; seniority?: string }>()
    if (!body.targetRole) {
      return c.json({ error: 'targetRole is required' }, 400)
    }

    const report = await searchTalent(
      body.targetRole,
      body.targetSkills || [],
      body.location,
      body.seniority
    )

    return c.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/talent/search/stream', async (c) => {
  try {
    const body = await c.req.json<{ targetRole: string; targetSkills: string[]; location?: string; seniority?: string }>()
    if (!body.targetRole) {
      return c.json({ error: 'targetRole is required' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const sendProgress = async (message: string, progress: number) => {
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'analyzing', message, progress }),
          event: 'progress',
        })
      }

      try {
        let progressStep = 10
        const report = await searchTalent(
          body.targetRole,
          body.targetSkills || [],
          body.location,
          body.seniority,
          async (msg) => {
            progressStep = Math.min(progressStep + 20, 90)
            await sendProgress(msg, progressStep)
          }
        )

        await stream.writeSSE({
          data: JSON.stringify({
            stage: 'complete',
            message: 'Candidate search complete',
            progress: 100,
            data: report,
          }),
          event: 'progress',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await stream.writeSSE({
          data: JSON.stringify({ stage: 'error', message, progress: 0 }),
          event: 'progress',
        })
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

const port = 3001
console.log(`ProspectPilot API running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
