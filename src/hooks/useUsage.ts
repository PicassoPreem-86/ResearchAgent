import { useState, useEffect, useCallback } from 'react'

interface UsageStats {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

interface Quotas {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

export function useUsage(userId?: string) {
  const [usage, setUsage] = useState<UsageStats>({ researches: 0, comparisons: 0, discovers: 0, talents: 0 })
  const [quotas, setQuotas] = useState<Quotas>({ researches: 10, comparisons: 3, discovers: 5, talents: 5 })
  const [isLoading, setIsLoading] = useState(false)
  const enabled = !!userId

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage({
          researches: data.research ?? 0,
          comparisons: data.compare ?? 0,
          discovers: data.discover ?? 0,
          talents: data.talent ?? 0,
        })
        if (data.quotas) {
          setQuotas({
            researches: data.quotas.research ?? Infinity,
            comparisons: data.quotas.compare ?? Infinity,
            discovers: data.quotas.discover ?? Infinity,
            talents: data.quotas.talent ?? Infinity,
          })
        }
      }
    } catch {
      // Fallback: keep current local state
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const trackUsage = useCallback(
    async (_eventType: string, _domain?: string) => {
      // Server records usage via quota middleware after successful requests.
      // Just refresh client-side counts.
      await refresh()
    },
    [refresh]
  )

  const canUse = useCallback(
    (eventType: string): boolean => {
      if (!enabled) return true
      switch (eventType) {
        case 'research': return usage.researches < quotas.researches
        case 'compare': return usage.comparisons < quotas.comparisons
        case 'discover': return usage.discovers < quotas.discovers
        case 'talent': return usage.talents < quotas.talents
        default: return true
      }
    },
    [enabled, usage, quotas]
  )

  const getUsageLabel = useCallback((): string => {
    if (!enabled) return ''
    const total = usage.researches + usage.comparisons + usage.discovers + usage.talents
    const totalQuota = quotas.researches + quotas.comparisons + quotas.discovers + quotas.talents
    return `${total}/${totalQuota}`
  }, [enabled, usage, quotas])

  return {
    usage,
    quotas,
    isLoading,
    enabled,
    refresh,
    trackUsage,
    canUse,
    getUsageLabel,
  }
}
