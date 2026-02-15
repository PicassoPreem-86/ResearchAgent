import type { Context, Next } from 'hono'

interface QuotaConfig {
  research: number
  compare: number
  discover: number
  talent: number
}

const FREE_TIER: QuotaConfig = {
  research: 10,
  compare: 3,
  discover: 5,
  talent: 5,
}

export type QuotaType = keyof QuotaConfig

export async function checkQuota(userId: string, type: QuotaType): Promise<{ allowed: boolean; used: number; limit: number }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true, used: 0, limit: Infinity }
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', type)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('Quota check failed:', error)
    return { allowed: true, used: 0, limit: FREE_TIER[type] }
  }

  const used = count || 0
  const limit = FREE_TIER[type]

  return { allowed: used < limit, used, limit }
}

export async function recordUsage(userId: string, type: QuotaType, domain?: string, tokensUsed?: number): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: type,
    domain: domain || null,
    tokens_used: tokensUsed || 0,
  })
}

export function createQuotaMiddleware(type: QuotaType) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId')

    if (!userId) return next()

    const quota = await checkQuota(userId, type)

    if (!quota.allowed) {
      return c.json({
        error: 'Monthly quota exceeded',
        quotaType: type,
        used: quota.used,
        limit: quota.limit,
      }, 429)
    }

    await next()

    if (c.res.status >= 200 && c.res.status < 300) {
      const domain = (await c.req.json().catch(() => ({}))).domain
      recordUsage(userId, type, domain).catch(() => {})
    }
  }
}
