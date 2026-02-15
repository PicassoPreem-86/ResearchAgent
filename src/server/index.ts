// Load .env FIRST before any other imports that use env vars
import 'dotenv/config'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { streamSSE } from 'hono/streaming'
import fs from 'fs'
import path from 'path'
import { scrapeCompany } from './scraper.js'
import { analyzeCompany, generateComparison } from './analyzer.js'
import { parseCsvDomains, processBulk, generateCsv } from './bulk.js'
import { saveReport, getHistory, deleteReport } from './history.js'
import { generatePdf, generateComparisonPdf } from './pdf.js'
import { discoverByICP, discoverLookalike, discoverByKeywords } from './discover.js'
import { saveICP, loadICP } from './icp.js'
import { validateDomain } from './validate.js'
import { searchTalent } from './talent.js'
import { compareReports } from './diff.js'
import { detectSignals, type Signal } from './signals.js'
import { generateApiKey, hashApiKey, validateApiKey } from './apiKeys.js'
import { createRateLimiter } from './rateLimit.js'
import { getCached, setCache, getCacheStats } from './cache.js'
import { authMiddleware } from './authMiddleware.js'
import { createQuotaMiddleware, checkQuota } from './quota.js'
import type { ResearchProgress, EmailTone, SellerContext, ReportTemplate, ProspectReport, ComparisonReport, ICP, DiscoverResults, TalentReport, GeoTarget } from '../types/prospect.js'
import { migrateGeography } from '../types/prospect.js'

const startTime = Date.now()
export const app = new Hono()

app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

// Request size limit (1MB)
app.use('/api/*', async (c, next) => {
  const contentLength = parseInt(c.req.header('content-length') || '0')
  if (contentLength > 1048576) {
    return c.json({ error: 'Request body too large (max 1MB)' }, 413)
  }
  return next()
})

// Rate limiting
const generalLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 })
const researchLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

app.use('/api/*', generalLimiter)
app.use('/api/*', authMiddleware)
app.use('/api/research/*', researchLimiter)
app.use('/api/discover/*', researchLimiter)
app.use('/api/talent/*', researchLimiter)
app.post('/api/research', researchLimiter)

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  uptime: Math.floor((Date.now() - startTime) / 1000),
}))

// Cache stats
app.get('/api/cache/stats', (c) => c.json(getCacheStats()))

// Usage quota endpoint
app.get('/api/usage', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({
      research: 0, compare: 0, discover: 0, talent: 0,
      quotas: { research: Infinity, compare: Infinity, discover: Infinity, talent: Infinity },
    })
  }

  const [research, compare, discover, talent] = await Promise.all([
    checkQuota(userId, 'research'),
    checkQuota(userId, 'compare'),
    checkQuota(userId, 'discover'),
    checkQuota(userId, 'talent'),
  ])

  return c.json({
    research: research.used,
    compare: compare.used,
    discover: discover.used,
    talent: talent.used,
    quotas: {
      research: research.limit,
      compare: compare.limit,
      discover: discover.limit,
      talent: talent.limit,
    },
  })
})

// Non-streaming research endpoint
app.post('/api/research', createQuotaMiddleware('research'), async (c) => {
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

    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    const fresh = c.req.query('fresh') === 'true'
    let scrapedData = fresh ? null : getCached(domain)
    if (!scrapedData) {
      scrapedData = await scrapeCompany(domain)
      setCache(domain, scrapedData)
    }

    const report = await analyzeCompany(domain, scrapedData, body.senderContext, undefined, body.tone, body.sellerContext, body.template)

    saveReport(report)

    return c.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// SSE stream timeout (5 minutes)
const STREAM_TIMEOUT = 5 * 60 * 1000

// SSE streaming research endpoint
app.post('/api/research/stream', createQuotaMiddleware('research'), async (c) => {
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

    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    const fresh = c.req.query('fresh') === 'true'

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: 'Stream timeout exceeded (5 min)', progress: 0 }), event: 'progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

      const sendEvent = async (data: ResearchProgress) => {
        await stream.writeSSE({ data: JSON.stringify(data), event: 'progress' })
      }

      try {
        // Check cache first
        const cached = fresh ? null : getCached(domain)
        let scrapedData

        if (cached) {
          await sendEvent({ stage: 'scraping', message: 'Using cached data...', progress: 35 })
          scrapedData = cached
        } else {
          // Stage 1: Scraping
          await sendEvent({ stage: 'scraping', message: 'Analyzing homepage...', progress: 10 })

          scrapedData = await scrapeCompany(domain, async (msg) => {
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

          setCache(domain, scrapedData)
        }

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
      } finally {
        clearTimeout(timeoutId)
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
      try {
        domains = body.domains.map((d) => validateDomain(d))
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
      }
    } else if (body.csv) {
      domains = parseCsvDomains(body.csv)
    }

    if (domains.length === 0) {
      return c.json({ error: 'No valid domains provided. Send "domains" array or "csv" string.' }, 400)
    }

    if (domains.length > 50) {
      return c.json({ error: 'Maximum 50 domains per batch' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ type: 'error', message: 'Stream timeout exceeded (5 min)' }), event: 'bulk_progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

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
      } finally {
        clearTimeout(timeoutId)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// Multi-company comparison endpoint (SSE streaming)
app.post('/api/research/compare', createQuotaMiddleware('compare'), async (c) => {
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

    let domains: string[]
    try {
      domains = body.domains.map((d) => validateDomain(d))
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: 'Stream timeout exceeded (5 min)', progress: 0 }), event: 'progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

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

          let scrapedData = getCached(domain)
          if (!scrapedData) {
            scrapedData = await scrapeCompany(domain)
            setCache(domain, scrapedData)
          }

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
      } finally {
        clearTimeout(timeoutId)
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

// Multi-format export endpoints
app.post('/api/export/json', async (c) => {
  try {
    const report = await c.req.json<ProspectReport>()
    if (!report.company?.name) {
      return c.json({ error: 'Valid ProspectReport is required' }, 400)
    }
    const clean = {
      company: report.company,
      executiveSummary: report.executiveSummary,
      swot: report.swot,
      marketPosition: report.marketPosition,
      competitiveLandscape: report.competitiveLandscape,
      painPoints: report.painPoints,
      risks: report.risks,
      keyPeople: report.keyPeople,
      financialSignals: report.financialSignals,
      jobInsights: report.jobInsights,
      strategicRecommendations: report.strategicRecommendations,
      researchedAt: report.researchedAt,
      template: report.template,
    }
    const json = JSON.stringify(clean, null, 2)
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${report.company.domain}-report.json"`,
      },
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.post('/api/export/markdown', async (c) => {
  try {
    const report = await c.req.json<ProspectReport>()
    if (!report.company?.name) {
      return c.json({ error: 'Valid ProspectReport is required' }, 400)
    }
    const { reportToMarkdown } = await import('../utils/exportFormatters.js')
    const md = reportToMarkdown(report)
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${report.company.domain}-report.md"`,
      },
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.post('/api/export/csv', async (c) => {
  try {
    const report = await c.req.json<ProspectReport>()
    if (!report.company?.name) {
      return c.json({ error: 'Valid ProspectReport is required' }, 400)
    }
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
    const csv = [headers.join(','), values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${report.company.domain}-report.csv"`,
      },
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// --- API Key Management ---

app.post('/api/keys', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  try {
    const body = await c.req.json<{ name?: string }>()
    const { key, hash } = generateApiKey()

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return c.json({ error: 'Supabase not configured' }, 500)
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: hash,
        name: body.name || 'Default',
        permissions: ['read', 'write'],
      })
      .select('id, name, created_at')
      .single()

    if (error) {
      return c.json({ error: 'Failed to create API key' }, 500)
    }

    return c.json({ id: data.id, key, name: data.name, createdAt: data.created_at })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.get('/api/keys', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return c.json([])
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at, revoked_at, key_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return c.json({ error: 'Failed to list API keys' }, 500)
    }

    const masked = (data || []).map(k => ({
      id: k.id,
      name: k.name,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
      revokedAt: k.revoked_at,
      keyPreview: `ra_${k.key_hash.slice(0, 6)}...${k.key_hash.slice(-4)}`,
    }))

    return c.json(masked)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.delete('/api/keys/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return c.json({ error: 'Supabase not configured' }, 500)
  }

  try {
    const keyId = c.req.param('id')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', userId)

    if (error) {
      return c.json({ error: 'Failed to revoke key' }, 500)
    }

    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// --- API v1 (supports both session auth and API key auth) ---

const apiV1Auth = async (c: Parameters<typeof app.get>[1] extends (c: infer C, ...args: unknown[]) => unknown ? C : never, next: () => Promise<void>) => {
  // Check for API key in Authorization header
  const authHeader = c.req.header('authorization')

  if (authHeader?.startsWith('Bearer ra_')) {
    const apiKey = authHeader.slice(7)
    const result = await validateApiKey(apiKey)
    if (!result.valid) {
      return c.json({ error: 'Invalid API key' }, 401)
    }
    c.set('userId', result.userId)
    return next()
  }

  // Fall through to normal auth
  return next()
}

app.use('/api/v1/*', apiV1Auth)

app.post('/api/v1/research', async (c) => {
  try {
    const body = await c.req.json<{
      domain: string
      template?: ReportTemplate
      senderContext?: { name?: string; company?: string; role?: string }
      tone?: EmailTone
      sellerContext?: SellerContext
    }>()

    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    const fresh = c.req.query('fresh') === 'true'
    let scrapedData = fresh ? null : getCached(domain)
    if (!scrapedData) {
      scrapedData = await scrapeCompany(domain)
      setCache(domain, scrapedData)
    }

    const report = await analyzeCompany(domain, scrapedData, body.senderContext, undefined, body.tone, body.sellerContext, body.template)
    saveReport(report)

    return c.json({ success: true, data: report })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.post('/api/v1/compare', async (c) => {
  try {
    const body = await c.req.json<{
      domains: string[]
      template?: ReportTemplate
      senderContext?: { name?: string; company?: string; role?: string }
      tone?: EmailTone
      sellerContext?: SellerContext
    }>()

    if (!body.domains || !Array.isArray(body.domains) || body.domains.length < 2) {
      return c.json({ error: 'At least 2 domains required' }, 400)
    }
    if (body.domains.length > 5) {
      return c.json({ error: 'Maximum 5 companies for comparison' }, 400)
    }

    let domains: string[]
    try {
      domains = body.domains.map(d => validateDomain(d))
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    const reports: ProspectReport[] = []
    for (const domain of domains) {
      let scrapedData = getCached(domain)
      if (!scrapedData) {
        scrapedData = await scrapeCompany(domain)
        setCache(domain, scrapedData)
      }
      const report = await analyzeCompany(domain, scrapedData, body.senderContext, undefined, body.tone, body.sellerContext, body.template)
      saveReport(report)
      reports.push(report)
    }

    const comparison = await generateComparison(reports)
    return c.json({ success: true, data: comparison })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.get('/api/v1/reports', (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 200)
    const offset = parseInt(c.req.query('offset') || '0', 10) || 0
    const result = getHistory(limit, offset)
    return c.json({ success: true, data: result })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

app.get('/api/v1/reports/:domain', (c) => {
  try {
    const domain = c.req.param('domain')
    const result = getHistory(200, 0)
    const report = result.reports.find(r => r.company.domain === domain)
    if (!report) {
      return c.json({ error: 'Report not found' }, 404)
    }
    return c.json({ success: true, data: report })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// History endpoints
app.get('/api/history', (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 200)
    const offset = parseInt(c.req.query('offset') || '0', 10) || 0
    const result = getHistory(limit, offset)
    return c.json(result)
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
      geography: migrateGeography(icp.geography),
      fundingStage: icp.fundingStage || '',
    })
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// --- Discover endpoints ---

app.post('/api/discover/icp', createQuotaMiddleware('discover'), async (c) => {
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

app.post('/api/discover/icp/stream', createQuotaMiddleware('discover'), async (c) => {
  try {
    const body = await c.req.json<{ icp: ICP }>()
    if (!body.icp) {
      return c.json({ error: 'icp object is required' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: 'Stream timeout exceeded (5 min)', progress: 0 }), event: 'progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

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
      } finally {
        clearTimeout(timeoutId)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/lookalike', createQuotaMiddleware('discover'), async (c) => {
  try {
    const body = await c.req.json<{ domain: string; geography?: GeoTarget }>()
    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }
    const companies = await discoverLookalike(domain, undefined, body.geography)

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

app.post('/api/discover/lookalike/stream', createQuotaMiddleware('discover'), async (c) => {
  try {
    const body = await c.req.json<{ domain: string; geography?: GeoTarget }>()
    if (!body.domain) {
      return c.json({ error: 'domain is required' }, 400)
    }

    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: 'Stream timeout exceeded (5 min)', progress: 0 }), event: 'progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

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
        }, body.geography)

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
      } finally {
        clearTimeout(timeoutId)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/discover/search', createQuotaMiddleware('discover'), async (c) => {
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

app.post('/api/talent/search', createQuotaMiddleware('talent'), async (c) => {
  try {
    const body = await c.req.json<{ targetRole: string; targetSkills: string[]; location?: GeoTarget; seniority?: string }>()
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

app.post('/api/talent/search/stream', createQuotaMiddleware('talent'), async (c) => {
  try {
    const body = await c.req.json<{ targetRole: string; targetSkills: string[]; location?: GeoTarget; seniority?: string }>()
    if (!body.targetRole) {
      return c.json({ error: 'targetRole is required' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const timeoutId = setTimeout(() => {
        stream.writeSSE({ data: JSON.stringify({ stage: 'error', message: 'Stream timeout exceeded (5 min)', progress: 0 }), event: 'progress' }).catch(() => {})
        stream.close()
      }, STREAM_TIMEOUT)

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
      } finally {
        clearTimeout(timeoutId)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// --- Signal monitoring endpoints ---

let signalStore: Signal[] = []

app.get('/api/signals', async (c) => {
  return c.json({ signals: signalStore })
})

app.put('/api/signals/:id/read', async (c) => {
  const { id } = c.req.param()
  signalStore = signalStore.map(s => s.id === id ? { ...s, read: true } : s)
  return c.json({ success: true })
})

app.post('/api/signals/check', async (c) => {
  const { domain, previousReport } = await c.req.json()
  if (!domain) return c.json({ error: 'domain required' }, 400)

  try {
    const scraped = await scrapeCompany(domain)
    const newReport = await analyzeCompany(domain, scraped)
    const newSignals = detectSignals(domain, previousReport, newReport)

    // Add to store (dedup by domain + type + date)
    for (const signal of newSignals) {
      const exists = signalStore.some(s =>
        s.domain === signal.domain && s.type === signal.type &&
        s.detectedAt.slice(0, 10) === signal.detectedAt.slice(0, 10)
      )
      if (!exists) signalStore.push(signal)
    }

    return c.json({ signals: newSignals, newReport })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/signals/dismiss-all', async (c) => {
  signalStore = signalStore.map(s => ({ ...s, read: true }))
  return c.json({ success: true })
})

// --- Watch list change detection endpoints ---

app.post('/api/watch/check', async (c) => {
  const body = await c.req.json<{ domain: string; previousReport?: Record<string, unknown> }>()
  if (!body.domain) return c.json({ error: 'domain required' }, 400)

  try {
    let domain: string
    try {
      domain = validateDomain(body.domain)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Invalid domain' }, 400)
    }

    const scrapedData = await scrapeCompany(domain)
    setCache(domain, scrapedData)
    const newReport = await analyzeCompany(domain, scrapedData)

    if (!body.previousReport) {
      return c.json({
        domain,
        changesDetected: 0,
        changes: [],
        significance: 'none' as const,
        summary: 'First check - no previous data to compare.',
        checkedAt: new Date().toISOString(),
        newReport,
      })
    }

    const changeReport = compareReports(
      body.previousReport as Partial<ProspectReport>,
      newReport,
      domain
    )
    return c.json({ ...changeReport, newReport })
  } catch (err) {
    return c.json({ error: `Failed to check ${body.domain}: ${(err as Error).message}` }, 500)
  }
})

app.post('/api/watch/check-all', async (c) => {
  const body = await c.req.json<{
    items: Array<{ domain: string; previousReport?: Record<string, unknown> }>
  }>()
  if (!body.items?.length) return c.json({ error: 'items required' }, 400)
  if (body.items.length > 10) return c.json({ error: 'Max 10 domains per check' }, 400)

  const results: Array<{
    domain: string
    changesDetected: number
    changes: unknown[]
    significance: string
    summary: string
    checkedAt: string
    newReport?: ProspectReport
  }> = []

  for (let i = 0; i < body.items.length; i += 2) {
    const batch = body.items.slice(i, i + 2)
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        let domain: string
        try {
          domain = validateDomain(item.domain)
        } catch {
          throw new Error(`Invalid domain: ${item.domain}`)
        }

        const scrapedData = await scrapeCompany(domain)
        setCache(domain, scrapedData)
        const newReport = await analyzeCompany(domain, scrapedData)

        if (!item.previousReport) {
          return {
            domain,
            changesDetected: 0,
            changes: [] as unknown[],
            significance: 'none' as const,
            summary: 'First check.',
            checkedAt: new Date().toISOString(),
            newReport,
          }
        }

        const changeReport = compareReports(
          item.previousReport as Partial<ProspectReport>,
          newReport,
          domain
        )
        return { ...changeReport, newReport }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    }
  }

  return c.json({ results })
})

// --- Collaboration endpoints ---

// Helper to get Supabase admin client (server-side)
async function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// List workspace members
app.get('/api/workspaces/:id/members', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ members: [], message: 'Supabase not configured' })

  const workspaceId = c.req.param('id')
  const { data, error } = await sb
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, invited_at, accepted_at')
    .eq('workspace_id', workspaceId)

  if (error) return c.json({ error: error.message }, 500)

  const members = await Promise.all(
    (data ?? []).map(async (m) => {
      const { data: userData } = await sb.auth.admin.getUserById(m.user_id)
      return {
        id: m.id,
        userId: m.user_id,
        email: userData?.user?.email ?? 'unknown',
        role: m.role,
        invitedAt: m.invited_at,
        acceptedAt: m.accepted_at,
      }
    })
  )

  return c.json({ members })
})

// Add member by email
app.post('/api/workspaces/:id/members', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const workspaceId = c.req.param('id')
  const userId = c.get('userId')
  const body = await c.req.json<{ email: string; role?: string }>()

  if (!body.email) return c.json({ error: 'email is required' }, 400)

  const { data: callerMember } = await sb
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!callerMember || callerMember.role !== 'owner') {
    return c.json({ error: 'Only workspace owners can add members' }, 403)
  }

  const { data: users } = await sb.auth.admin.listUsers()
  const target = users?.users?.find((u) => u.email === body.email)
  if (!target) return c.json({ error: 'User not found' }, 404)

  const role = body.role && ['editor', 'viewer'].includes(body.role) ? body.role : 'viewer'
  const { error } = await sb
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: target.id, role })

  if (error) {
    if (error.message.includes('duplicate')) return c.json({ error: 'User already a member' }, 409)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ success: true, userId: target.id, email: body.email, role })
})

// Update member role
app.put('/api/workspaces/:id/members/:userId', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const workspaceId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const callerId = c.get('userId')
  const body = await c.req.json<{ role: string }>()

  if (!body.role || !['editor', 'viewer'].includes(body.role)) {
    return c.json({ error: 'role must be editor or viewer' }, 400)
  }

  const { data: callerMember } = await sb
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', callerId)
    .single()

  if (!callerMember || callerMember.role !== 'owner') {
    return c.json({ error: 'Only workspace owners can update roles' }, 403)
  }

  const { error } = await sb
    .from('workspace_members')
    .update({ role: body.role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// Remove member
app.delete('/api/workspaces/:id/members/:userId', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const workspaceId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const callerId = c.get('userId')

  const { data: callerMember } = await sb
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', callerId)
    .single()

  if (!callerMember || callerMember.role !== 'owner') {
    return c.json({ error: 'Only workspace owners can remove members' }, 403)
  }

  if (targetUserId === callerId) {
    return c.json({ error: 'Cannot remove yourself as owner' }, 400)
  }

  const { error } = await sb
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// List comments
app.get('/api/workspaces/:id/comments', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ comments: [], message: 'Supabase not configured' })

  const workspaceId = c.req.param('id')
  const reportDomain = c.req.query('domain')
  const section = c.req.query('section')

  let query = sb
    .from('workspace_comments')
    .select('id, workspace_id, report_domain, section, user_id, content, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (reportDomain) query = query.eq('report_domain', reportDomain)
  if (section) query = query.eq('section', section)

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 500)

  const comments = await Promise.all(
    (data ?? []).map(async (cm) => {
      const { data: userData } = await sb.auth.admin.getUserById(cm.user_id)
      return {
        id: cm.id,
        userId: cm.user_id,
        userEmail: userData?.user?.email ?? 'unknown',
        reportDomain: cm.report_domain,
        section: cm.section,
        content: cm.content,
        createdAt: cm.created_at,
        updatedAt: cm.updated_at,
      }
    })
  )

  return c.json({ comments })
})

// Add comment
app.post('/api/workspaces/:id/comments', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const workspaceId = c.req.param('id')
  const userId = c.get('userId')
  const body = await c.req.json<{ reportDomain: string; section?: string; content: string }>()

  if (!body.reportDomain || !body.content?.trim()) {
    return c.json({ error: 'reportDomain and content are required' }, 400)
  }

  const { data: member } = await sb
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!member || member.role === 'viewer') {
    return c.json({ error: 'Only editors and owners can comment' }, 403)
  }

  const { data, error } = await sb
    .from('workspace_comments')
    .insert({
      workspace_id: workspaceId,
      report_domain: body.reportDomain,
      section: body.section ?? null,
      user_id: userId,
      content: body.content.trim(),
    })
    .select('id, created_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true, id: data.id, createdAt: data.created_at })
})

// Delete comment
app.delete('/api/comments/:id', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const commentId = c.req.param('id')
  const userId = c.get('userId')

  const { data: comment } = await sb
    .from('workspace_comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment) return c.json({ error: 'Comment not found' }, 404)
  if (comment.user_id !== userId) return c.json({ error: 'Can only delete your own comments' }, 403)

  const { error } = await sb
    .from('workspace_comments')
    .delete()
    .eq('id', commentId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// Create share link
app.post('/api/share', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const userId = c.get('userId')
  const body = await c.req.json<{
    reportId?: string
    workspaceId?: string
    accessLevel?: string
    expiresIn?: string
  }>()

  if (!body.reportId && !body.workspaceId) {
    return c.json({ error: 'reportId or workspaceId is required' }, 400)
  }

  const accessLevel = body.accessLevel === 'comment' ? 'comment' : 'view'

  let expiresAt: string | null = null
  if (body.expiresIn) {
    const now = new Date()
    const hours: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 }
    const h = hours[body.expiresIn]
    if (h) {
      now.setHours(now.getHours() + h)
      expiresAt = now.toISOString()
    }
  }

  const { data, error } = await sb
    .from('share_links')
    .insert({
      report_id: body.reportId ?? null,
      workspace_id: body.workspaceId ?? null,
      access_level: accessLevel,
      expires_at: expiresAt,
      created_by: userId,
    })
    .select('id, token, access_level, expires_at, created_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)

  const baseUrl = process.env.APP_URL || c.req.header('origin') || 'http://localhost:5173'
  return c.json({
    id: data.id,
    token: data.token,
    accessLevel: data.access_level,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    url: `${baseUrl}/share/${data.token}`,
    viewCount: 0,
  })
})

// View shared content (no auth required)
app.get('/api/share/:token', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Sharing not available' }, 503)

  const token = c.req.param('token')

  const { data: link, error } = await sb
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !link) return c.json({ error: 'Share link not found' }, 404)

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return c.json({ error: 'Share link has expired' }, 410)
  }

  await sb
    .from('share_links')
    .update({ view_count: (link.view_count || 0) + 1 })
    .eq('id', link.id)

  let content: unknown = null
  if (link.report_id) {
    const { data: report } = await sb
      .from('reports')
      .select('domain, report_data, template, created_at')
      .eq('id', link.report_id)
      .single()
    content = report
  } else if (link.workspace_id) {
    const { data: workspace } = await sb
      .from('workspaces')
      .select('name, description, created_at')
      .eq('id', link.workspace_id)
      .single()
    content = workspace
  }

  return c.json({
    accessLevel: link.access_level,
    content,
    viewCount: (link.view_count || 0) + 1,
  })
})

// Revoke share link
app.delete('/api/share/:id', async (c) => {
  const sb = await getSupabaseAdmin()
  if (!sb) return c.json({ error: 'Supabase not configured' }, 503)

  const linkId = c.req.param('id')
  const userId = c.get('userId')

  const { data: link } = await sb
    .from('share_links')
    .select('created_by')
    .eq('id', linkId)
    .single()

  if (!link) return c.json({ error: 'Share link not found' }, 404)
  if (link.created_by !== userId) return c.json({ error: 'Can only revoke your own share links' }, 403)

  const { error } = await sb
    .from('share_links')
    .delete()
    .eq('id', linkId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (c) => {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html')
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8')
      return c.html(html)
    }
    return c.text('Not found', 404)
  })
}

const port = Number(process.env.PORT) || 3001
console.log(`ResearchAgent API running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
