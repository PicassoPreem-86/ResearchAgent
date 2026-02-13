import { useState, useCallback, useRef } from 'react'
import type { TalentReport, ResearchStage, GeoTarget } from '@/types/prospect'

interface TalentProgress {
  stage: ResearchStage
  message: string
  progress: number
}

interface UseTalentReturn {
  progress: TalentProgress
  talentReport: TalentReport | null
  error: string | null
  isSearching: boolean
  searchTalent: (targetRole: string, targetSkills: string[], location?: GeoTarget, seniority?: string) => void
  reset: () => void
}

const INITIAL_PROGRESS: TalentProgress = {
  stage: 'idle',
  message: '',
  progress: 0,
}

export function useTalent(): UseTalentReturn {
  const [progress, setProgress] = useState<TalentProgress>(INITIAL_PROGRESS)
  const [talentReport, setTalentReport] = useState<TalentReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isSearching = !['idle', 'complete', 'error'].includes(progress.stage)

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setProgress(INITIAL_PROGRESS)
    setTalentReport(null)
    setError(null)
  }, [])

  const searchTalent = useCallback((targetRole: string, targetSkills: string[], location?: GeoTarget, seniority?: string) => {
    setError(null)
    setTalentReport(null)
    setProgress({ stage: 'scraping', message: 'Starting candidate search...', progress: 5 })

    const abortController = new AbortController()
    abortRef.current = abortController

    fetch('/api/talent/search/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole, targetSkills, location, seniority }),
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Candidate search failed (${response.status})`)
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
                    setTalentReport(data.data as TalentReport)
                    setProgress({ stage: 'complete', message: 'Candidate search complete', progress: 100 })
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

  return { progress, talentReport, error, isSearching, searchTalent, reset }
}
