import { useState, useEffect, useCallback } from 'react'

export interface Signal {
  id: string
  type: string
  severity: 'info' | 'notable' | 'critical'
  title: string
  description: string
  domain: string
  detectedAt: string
  read: boolean
}

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/signals')
      if (res.ok) {
        const data = await res.json()
        setSignals(data.signals || [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const unreadCount = signals.filter(s => !s.read).length

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/signals/${id}/read`, { method: 'PUT' })
    setSignals(prev => prev.map(s => s.id === id ? { ...s, read: true } : s))
  }, [])

  const checkDomain = useCallback(async (domain: string, previousReport?: any) => {
    const res = await fetch('/api/signals/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, previousReport })
    })
    if (res.ok) {
      const data = await res.json()
      await refresh()
      return data.signals
    }
    return []
  }, [refresh])

  const dismissAll = useCallback(async () => {
    await fetch('/api/signals/dismiss-all', { method: 'POST' })
    setSignals(prev => prev.map(s => ({ ...s, read: true })))
  }, [])

  return { signals, unreadCount, isLoading, refresh, markRead, checkDomain, dismissAll }
}
