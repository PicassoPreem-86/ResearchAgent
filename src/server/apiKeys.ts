import crypto from 'node:crypto'

export function generateApiKey(): { key: string; hash: string } {
  const key = `ra_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; userId?: string; keyId?: string }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { valid: false }
  }

  const hash = hashApiKey(key)
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', hash)
    .single()

  if (error || !data || data.revoked_at) {
    return { valid: false }
  }

  // Update last_used_at
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return { valid: true, userId: data.user_id, keyId: data.id }
}
