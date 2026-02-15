import { useState, useEffect, useCallback } from 'react'

export interface WatchedCompany {
  id: string
  domain: string
  lastSnapshot: Record<string, unknown> | null
  lastCheckedAt: string | null
  createdAt: string
  changesDetected?: number
}

// We need a watched_companies table. Since it doesn't exist in the initial migration,
// we'll use the reports table with a convention (or store in icp_profiles).
// For clean implementation, we'll create a dedicated migration and use the reports table
// with a watch flag approach. For now, we use localStorage as a lightweight approach
// that works without extra DB tables.

interface WatchListStore {
  watched: WatchedCompany[]
}

const STORAGE_KEY = 'research-agent-watchlist'

function loadFromStorage(): WatchedCompany[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: WatchListStore = JSON.parse(raw)
    return parsed.watched ?? []
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

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load from localStorage (works with or without Supabase)
      setWatched(loadFromStorage())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addToWatchList = useCallback(
    async (domain: string, snapshot?: Record<string, unknown>) => {
      const exists = watched.find((w) => w.domain === domain)
      if (exists) return

      const newEntry: WatchedCompany = {
        id: crypto.randomUUID(),
        domain,
        lastSnapshot: snapshot ?? null,
        lastCheckedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
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
    async (id: string, snapshot: Record<string, unknown>) => {
      const updated = watched.map((w) =>
        w.id === id
          ? { ...w, lastSnapshot: snapshot, lastCheckedAt: new Date().toISOString() }
          : w
      )
      setWatched(updated)
      saveToStorage(updated)
    },
    [watched]
  )

  const checkForChanges = useCallback(
    async (domain: string): Promise<string[]> => {
      // Trigger a scrape and compare with last snapshot
      try {
        const res = await fetch(`/api/research?domain=${encodeURIComponent(domain)}`)
        if (!res.ok) return []

        // This is a simplified check - in production, you'd compare specific fields
        return ['Check complete - view report for details']
      } catch {
        return []
      }
    },
    []
  )

  return {
    watched,
    isLoading,
    enabled: true, // Watch list works without Supabase via localStorage
    refresh,
    addToWatchList,
    removeFromWatchList,
    isWatching,
    updateSnapshot,
    checkForChanges,
  }
}
