import { useState, useCallback, useRef } from 'react'
import type { ProspectReport, ResearchProgress, ResearchStage, EmailTone, SellerContext, ReportTemplate } from '@/types/prospect'

export interface ScrapeDetail {
  url: string
  status: 'fetching' | 'success' | 'failed'
  pageType: string
}

interface SenderContext {
  senderName?: string
  senderCompany?: string
  senderRole?: string
}

interface UseResearchReturn {
  progress: ResearchProgress
  report: ProspectReport | null
  error: string | null
  isResearching: boolean
  scrapeLog: ScrapeDetail[]
  startResearch: (domain: string, senderContext?: SenderContext, tone?: EmailTone, sellerContext?: SellerContext, template?: ReportTemplate) => void
  reset: () => void
}

const INITIAL_PROGRESS: ResearchProgress = {
  stage: 'idle',
  message: '',
  progress: 0,
}

export function useResearch(): UseResearchReturn {
  const [progress, setProgress] = useState<ResearchProgress>(INITIAL_PROGRESS)
  const [report, setReport] = useState<ProspectReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scrapeLog, setScrapeLog] = useState<ScrapeDetail[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const isResearching = !['idle', 'complete', 'error'].includes(progress.stage)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setProgress(INITIAL_PROGRESS)
    setReport(null)
    setError(null)
    setScrapeLog([])
  }, [])

  const startResearch = useCallback((domain: string, senderContext?: SenderContext, tone?: EmailTone, sellerContext?: SellerContext, template?: ReportTemplate) => {
    setError(null)
    setReport(null)
    setScrapeLog([])
    setProgress({ stage: 'scraping', message: 'Connecting to target...', progress: 0 })

    const abortController = new AbortController()
    abortRef.current = abortController

    const senderPayload = senderContext
      ? {
          senderContext: {
            name: senderContext.senderName,
            company: senderContext.senderCompany,
            role: senderContext.senderRole,
          },
        }
      : {}

    const body = JSON.stringify({
      domain: domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      ...senderPayload,
      ...(tone ? { tone } : {}),
      ...(sellerContext ? { sellerContext } : {}),
      ...(template ? { template } : {}),
    })

    fetch('/api/research/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Research failed (${response.status})`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response stream')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        const read = (): Promise<void> => {
          return reader.read().then(({ done, value }) => {
            if (done) return

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))

                  // Handle scrape_detail events
                  if (data.url && data.status && data.pageType) {
                    setScrapeLog((prev) => {
                      // Update existing entry or add new
                      const existing = prev.findIndex((e) => e.url === data.url && e.pageType === data.pageType)
                      if (existing >= 0) {
                        const next = [...prev]
                        next[existing] = { url: data.url, status: data.status, pageType: data.pageType }
                        return next
                      }
                      return [...prev, { url: data.url, status: data.status, pageType: data.pageType }]
                    })
                    continue
                  }

                  if (data.stage === 'complete' && data.data) {
                    setReport(data.data as ProspectReport)
                    setProgress({
                      stage: 'complete',
                      message: 'Research complete',
                      progress: 100,
                    })
                  } else if (data.stage === 'error') {
                    setError(data.message || 'Something went wrong')
                    setProgress({
                      stage: 'error',
                      message: data.message,
                      progress: 0,
                    })
                  } else if (data.stage && data.message !== undefined) {
                    setProgress({
                      stage: data.stage as ResearchStage,
                      message: data.message,
                      progress: data.progress ?? 0,
                    })
                  }
                } catch {
                  // skip malformed lines
                }
              }
            }

            return read()
          })
        }

        return read()
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Something went wrong')
        setProgress({ stage: 'error', message: err.message, progress: 0 })
      })
  }, [])

  return { progress, report, error, isResearching, scrapeLog, startResearch, reset }
}
