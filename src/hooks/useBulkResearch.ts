import { useState, useCallback, useRef } from 'react'
import type { ProspectReport } from '@/types/prospect'

export type DomainStatus = 'pending' | 'processing' | 'complete' | 'error'

export interface DomainResult {
  domain: string
  status: DomainStatus
  report?: ProspectReport
  error?: string
}

interface BulkProgress {
  type: 'item_start' | 'item_progress' | 'item_complete' | 'item_error' | 'bulk_complete'
  index: number
  total: number
  domain: string
  message: string
  report?: ProspectReport
  results?: Array<{ domain: string; status: string; report?: ProspectReport; error?: string }>
}

interface UseBulkResearchReturn {
  domainResults: DomainResult[]
  currentIndex: number
  total: number
  message: string
  isProcessing: boolean
  isComplete: boolean
  startBulk: (domains: string[], senderContext?: { senderName?: string; senderCompany?: string; senderRole?: string }) => void
  reset: () => void
  exportCsv: () => void
}

export function useBulkResearch(): UseBulkResearchReturn {
  const [domainResults, setDomainResults] = useState<DomainResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setDomainResults([])
    setCurrentIndex(-1)
    setTotal(0)
    setMessage('')
    setIsProcessing(false)
    setIsComplete(false)
  }, [])

  const startBulk = useCallback((domains: string[], senderContext?: { senderName?: string; senderCompany?: string; senderRole?: string }) => {
    reset()

    const initial: DomainResult[] = domains.map((d) => ({ domain: d, status: 'pending' }))
    setDomainResults(initial)
    setTotal(domains.length)
    setIsProcessing(true)
    setMessage(`Starting bulk research for ${domains.length} domains...`)

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

    fetch('/api/research/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains, ...senderPayload }),
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Bulk research failed (${response.status})`)

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
                  const data = JSON.parse(line.slice(6)) as BulkProgress
                  setMessage(data.message)

                  if (data.type === 'item_start') {
                    setCurrentIndex(data.index)
                    setDomainResults((prev) => {
                      const next = [...prev]
                      if (next[data.index]) {
                        next[data.index] = { ...next[data.index], status: 'processing' }
                      }
                      return next
                    })
                  } else if (data.type === 'item_complete' && data.report) {
                    setDomainResults((prev) => {
                      const next = [...prev]
                      if (next[data.index]) {
                        next[data.index] = { ...next[data.index], status: 'complete', report: data.report }
                      }
                      return next
                    })
                  } else if (data.type === 'item_error') {
                    setDomainResults((prev) => {
                      const next = [...prev]
                      if (next[data.index]) {
                        next[data.index] = { ...next[data.index], status: 'error', error: data.message }
                      }
                      return next
                    })
                  } else if (data.type === 'bulk_complete') {
                    setIsProcessing(false)
                    setIsComplete(true)
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
        setMessage(err.message || 'Bulk research failed')
        setIsProcessing(false)
      })
  }, [reset])

  const exportCsv = useCallback(() => {
    const results = domainResults.map((dr) => ({
      domain: dr.domain,
      status: dr.status === 'complete' ? 'success' : 'error',
      report: dr.report,
      error: dr.error,
    }))

    fetch('/api/research/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'prospect-research.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
  }, [domainResults])

  return {
    domainResults,
    currentIndex,
    total,
    message,
    isProcessing,
    isComplete,
    startBulk,
    reset,
    exportCsv,
  }
}
