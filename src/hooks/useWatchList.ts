import { useState, useEffect, useCallback } from 'react'
import type { ProspectReport } from '@/types/prospect'
import type { ChangeReport } from '@/server/diff'

export interface WatchedCompany {
  id: string
  domain: string
  lastSnapshot: ProspectReport | null
  lastCheckedAt: string | null
  createdAt: string
  changesDetected?: number
  lastChanges: ChangeReport | null
}

interface WatchListStore {
  watched: WatchedCompany[]
}

const STORAGE_KEY = 'research-agent-watchlist'

function loadFromStorage(): WatchedCompany[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: WatchListStore = JSON.parse(raw)
    return (parsed.watched ?? []).map((w) => ({
      ...w,
      lastChanges: w.lastChanges ?? null,
    }))
  } catch {
    return []
  }
}

function saveToStorage(watched: WatchedCompany[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ watched }))
}

export function useWatchList(_userId?: string) {
  const [watched, setWatched] = useState<WatchedCompany[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [checkingDomains, setCheckingDomains] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setWatched(loadFromStorage())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addToWatchList = useCallback(
    async (domain: string, snapshot?: ProspectReport | Record<string, unknown>) => {
      const exists = watched.find((w) => w.domain === domain)
      if (exists) return

      const newEntry: WatchedCompany = {
        id: crypto.randomUUID(),
        domain,
        lastSnapshot: (snapshot as ProspectReport) ?? null,
        lastCheckedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastChanges: null,
      }
      const updated = [newEntry, ...watched]
      setWatched(updated)
      saveToStorage(updated)
    },
    [watched]
  )

  const removeFromWatchList = useCallback(
    async (id: string) => {
      const updated = watched.filter((w) => w.id !== id)
      setWatched(updated)
      saveToStorage(updated)
    },
    [watched]
  )

  const isWatching = useCallback(
    (domain: string): boolean => {
      return watched.some((w) => w.domain === domain)
    },
    [watched]
  )

  const updateSnapshot = useCallback(
    async (id: string, snapshot: ProspectReport | Record<string, unknown>) => {
      const updated = watched.map((w) =>
        w.id === id
          ? {
              ...w,
              lastSnapshot: snapshot as ProspectReport,
              lastCheckedAt: new Date().toISOString(),
            }
          : w
      )
      setWatched(updated)
      saveToStorage(updated)
    },
    [watched]
  )

  const checkForChanges = useCallback(
    async (domain: string): Promise<ChangeReport | null> => {
      const entry = watched.find((w) => w.domain === domain)
      if (!entry) return null

      setCheckingDomains((prev) => new Set(prev).add(domain))

      try {
        const res = await fetch('/api/watch/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            previousReport: entry.lastSnapshot,
          }),
        })

        if (!res.ok) return null

        const result = await res.json() as ChangeReport & { newReport?: ProspectReport }
        const changeReport: ChangeReport = {
          domain: result.domain,
          changesDetected: result.changesDetected,
          changes: result.changes,
          significance: result.significance,
          summary: result.summary,
          checkedAt: result.checkedAt,
        }

        // Update the entry with new snapshot and change report
        const updated = watched.map((w) =>
          w.domain === domain
            ? {
                ...w,
                lastSnapshot: result.newReport ?? w.lastSnapshot,
                lastCheckedAt: new Date().toISOString(),
                changesDetected: changeReport.changesDetected,
                lastChanges: changeReport,
              }
            : w
        )
        setWatched(updated)
        saveToStorage(updated)

        return changeReport
      } catch {
        return null
      } finally {
        setCheckingDomains((prev) => {
          const next = new Set(prev)
          next.delete(domain)
          return next
        })
      }
    },
    [watched]
  )

  const checkAllForChanges = useCallback(async (): Promise<ChangeReport[]> => {
    if (watched.length === 0) return []

    const allDomains = watched.map((w) => w.domain)
    setCheckingDomains(new Set(allDomains))

    try {
      const res = await fetch('/api/watch/check-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: watched.map((w) => ({
            domain: w.domain,
            previousReport: w.lastSnapshot,
          })),
        }),
      })

      if (!res.ok) return []

      const { results } = await res.json() as {
        results: Array<ChangeReport & { newReport?: ProspectReport }>
      }

      // Update all entries with results
      const resultMap = new Map(results.map((r) => [r.domain, r]))
      const updated = watched.map((w) => {
        const result = resultMap.get(w.domain)
        if (!result) return w
        return {
          ...w,
          lastSnapshot: result.newReport ?? w.lastSnapshot,
          lastCheckedAt: new Date().toISOString(),
          changesDetected: result.changesDetected,
          lastChanges: {
            domain: result.domain,
            changesDetected: result.changesDetected,
            changes: result.changes,
            significance: result.significance,
            summary: result.summary,
            checkedAt: result.checkedAt,
          },
        }
      })
      setWatched(updated)
      saveToStorage(updated)

      return results.map((r) => ({
        domain: r.domain,
        changesDetected: r.changesDetected,
        changes: r.changes,
        significance: r.significance,
        summary: r.summary,
        checkedAt: r.checkedAt,
      }))
    } catch {
      return []
    } finally {
      setCheckingDomains(new Set())
    }
  }, [watched])

  const isChecking = useCallback(
    (domain: string): boolean => checkingDomains.has(domain),
    [checkingDomains]
  )

  const isCheckingAny = checkingDomains.size > 0

  return {
    watched,
    isLoading,
    enabled: true,
    refresh,
    addToWatchList,
    removeFromWatchList,
    isWatching,
    updateSnapshot,
    checkForChanges,
    checkAllForChanges,
    isChecking,
    isCheckingAny,
  }
}
