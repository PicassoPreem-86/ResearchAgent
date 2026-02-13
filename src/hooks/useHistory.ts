import { useState, useEffect, useCallback } from 'react'
import type { ProspectReport } from '@/types/prospect'

interface UseHistoryReturn {
  history: ProspectReport[]
  isLoading: boolean
  refresh: () => void
  deleteReport: (domain: string) => Promise<void>
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<ProspectReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = useCallback(() => {
    setIsLoading(true)
    fetch('/api/history')
      .then((res) => res.json())
      .then((data: ProspectReport[]) => {
        setHistory(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setHistory([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const deleteReportByDomain = useCallback(async (domain: string) => {
    const res = await fetch(`/api/history/${encodeURIComponent(domain)}`, { method: 'DELETE' })
    if (res.ok) {
      setHistory((prev) => prev.filter((r) => r.company.domain !== domain))
    }
  }, [])

  return {
    history,
    isLoading,
    refresh: fetchHistory,
    deleteReport: deleteReportByDomain,
  }
}
