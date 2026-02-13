import { useState, useCallback, useRef } from 'react'
import type { ICP, DiscoverResults, ResearchStage, GeoTarget } from '@/types/prospect'

interface DiscoverProgress {
  stage: ResearchStage
  message: string
  progress: number
}

interface UseDiscoverReturn {
  progress: DiscoverProgress
  results: DiscoverResults | null
  error: string | null
  isSearching: boolean
  discoverLookalike: (domain: string, geography?: GeoTarget) => void
  discoverByICP: (icp: ICP) => void
  saveICP: (icp: ICP) => Promise<void>
  loadICP: () => Promise<ICP | null>
  reset: () => void
}

const INITIAL_PROGRESS: DiscoverProgress = {
  stage: 'idle',
  message: '',
  progress: 0,
}

function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onProgress: (data: DiscoverProgress) => void,
  onComplete: (results: DiscoverResults) => void,
  onError: (message: string) => void,
): Promise<void> {
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
              onComplete(data.data as DiscoverResults)
            } else if (data.stage === 'error') {
              onError(data.message || 'Something went wrong')
            } else if (data.stage && data.message !== undefined) {
              onProgress({
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
}

export function useDiscover(): UseDiscoverReturn {
  const [progress, setProgress] = useState<DiscoverProgress>(INITIAL_PROGRESS)
  const [results, setResults] = useState<DiscoverResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isSearching = !['idle', 'complete', 'error'].includes(progress.stage)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setProgress(INITIAL_PROGRESS)
    setResults(null)
    setError(null)
  }, [])

  const streamRequest = useCallback((url: string, body: unknown) => {
    setError(null)
    setResults(null)
    setProgress({ stage: 'scraping', message: 'Starting discovery...', progress: 5 })

    const abortController = new AbortController()
    abortRef.current = abortController

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Discovery failed (${response.status})`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        return readSSEStream(
          reader,
          (prog) => setProgress(prog),
          (data) => {
            setResults(data)
            setProgress({ stage: 'complete', message: 'Discovery complete', progress: 100 })
          },
          (msg) => {
            setError(msg)
            setProgress({ stage: 'error', message: msg, progress: 0 })
          },
        )
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Something went wrong')
        setProgress({ stage: 'error', message: err.message, progress: 0 })
      })
  }, [])

  const discoverLookalike = useCallback(
    (domain: string, geography?: GeoTarget) => {
      const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      streamRequest('/api/discover/lookalike/stream', { domain: cleaned, geography })
    },
    [streamRequest],
  )

  const discoverByICP = useCallback(
    (icp: ICP) => {
      streamRequest('/api/discover/icp/stream', { icp })
    },
    [streamRequest],
  )

  const saveICPFn = useCallback(async (icp: ICP) => {
    await fetch('/api/icp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(icp),
    })
  }, [])

  const loadICPFn = useCallback(async (): Promise<ICP | null> => {
    try {
      const res = await fetch('/api/icp')
      if (!res.ok) return null
      const data = await res.json()
      return data || null
    } catch {
      return null
    }
  }, [])

  return {
    progress,
    results,
    error,
    isSearching,
    discoverLookalike,
    discoverByICP,
    saveICP: saveICPFn,
    loadICP: loadICPFn,
    reset,
  }
}
