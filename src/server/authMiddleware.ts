import type { Context, Next } from 'hono'

export async function authMiddleware(c: Context, next: Next) {
  // If Supabase not configured, allow all (dev mode)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return next()
  }

  const authHeader = c.req.header('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    // Verify with Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    c.set('userId', user.id)
    c.set('user', user)
    return next()
  } catch {
    return c.json({ error: 'Authentication failed' }, 401)
  }
}
