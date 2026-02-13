import { useState, useCallback, useRef } from 'react'
import type { ComparisonReport, ResearchStage, ReportTemplate, EmailTone, SellerContext } from '@/types/prospect'

interface ComparisonProgress {
  stage: ResearchStage
  message: string
  progress: number
}

interface UseComparisonReturn {
  progress: ComparisonProgress
  report: ComparisonReport | null
  error: string | null
  isComparing: boolean
  startComparison: (
    domains: string[],
    template?: ReportTemplate,
    senderContext?: { name?: string; company?: string; role?: string },
    tone?: EmailTone,
    sellerContext?: SellerContext,
  ) => void
  reset: () => void
}

const INITIAL_PROGRESS: ComparisonProgress = {
  stage: 'idle',
  message: '',
  progress: 0,
}

export function useComparison(): UseComparisonReturn {
  const [progress, setProgress] = useState<ComparisonProgress>(INITIAL_PROGRESS)
  const [report, setReport] = useState<ComparisonReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isComparing = !['idle', 'complete', 'error'].includes(progress.stage)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setProgress(INITIAL_PROGRESS)
    setReport(null)
    setError(null)
  }, [])

  const startComparison = useCallback((
    domains: string[],
    template?: ReportTemplate,
    senderContext?: { name?: string; company?: string; role?: string },
    tone?: EmailTone,
    sellerContext?: SellerContext,
  ) => {
    setError(null)
    setReport(null)
    setProgress({ stage: 'scraping', message: `Starting comparison of ${domains.length} companies...`, progress: 0 })

    const abortController = new AbortController()
    abortRef.current = abortController

    const body = JSON.stringify({
      domains: domains.map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
      ...(template ? { template } : {}),
      ...(senderContext ? { senderContext } : {}),
      ...(tone ? { tone } : {}),
      ...(sellerContext ? { sellerContext } : {}),
    })

    fetch('/api/research/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Comparison failed (${response.status})`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

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

                  if (data.stage === 'complete' && data.data) {
                    setReport(data.data as ComparisonReport)
                    setProgress({ stage: 'complete', message: 'Comparison complete', progress: 100 })
                  } else if (data.stage === 'error') {
                    setError(data.message || 'Something went wrong')
                    setProgress({ stage: 'error', message: data.message, progress: 0 })
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

  return { progress, report, error, isComparing, startComparison, reset }
}
