import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

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

const FREE_QUOTAS: Quotas = {
  researches: 10,
  comparisons: 3,
  discovers: 5,
  talents: 5,
}

export function useUsage(userId?: string) {
  const [usage, setUsage] = useState<UsageStats>({ researches: 0, comparisons: 0, discovers: 0, talents: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const enabled = isSupabaseConfigured() && !!userId
  const quotas = FREE_QUOTAS

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) return
    setIsLoading(true)
    try {
      // Get usage for current month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('usage_events')
        .select('event_type')
        .eq('user_id', userId!)
        .gte('created_at', startOfMonth.toISOString())

      if (error) throw error

      const counts: UsageStats = { researches: 0, comparisons: 0, discovers: 0, talents: 0 }
      for (const row of data ?? []) {
        if (row.event_type === 'research') counts.researches++
        else if (row.event_type === 'compare') counts.comparisons++
        else if (row.event_type === 'discover') counts.discovers++
        else if (row.event_type === 'talent') counts.talents++
      }
      setUsage(counts)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const trackUsage = useCallback(
    async (eventType: string, domain?: string) => {
      if (!supabase || !userId) return
      await supabase
        .from('usage_events')
        .insert({ user_id: userId, event_type: eventType, domain: domain ?? null })
      await refresh()
    },
    [supabase, userId, refresh]
  )

  const canUse = useCallback(
    (eventType: string): boolean => {
      if (!enabled) return true // No limits when Supabase isn't configured
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
