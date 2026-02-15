import { supabase, isSupabaseConfigured } from './supabase'
import type { ProspectReport } from '@/types/prospect'

/**
 * Database access layer. Uses Supabase when configured,
 * otherwise falls back to the local Hono API endpoints.
 */

export async function saveReport(
  report: ProspectReport,
  userId?: string
): Promise<void> {
  if (isSupabaseConfigured() && supabase && userId) {
    const { error } = await supabase
      .from('reports')
      .upsert(
        {
          user_id: userId,
          domain: report.company.domain,
          report_data: report as unknown as Record<string, unknown>,
          template: report.template,
        },
        { onConflict: 'user_id,domain' }
      )
    if (error) throw new Error(error.message)
    return
  }

  // Fallback: local API
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: report.company.domain }),
  })
  if (!res.ok) {
    throw new Error('Failed to save report locally')
  }
}

export async function getReports(
  userId?: string
): Promise<ProspectReport[]> {
  if (isSupabaseConfigured() && supabase && userId) {
    const { data, error } = await supabase
      .from('reports')
      .select('report_data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => r.report_data as unknown as ProspectReport)
  }

  // Fallback: local API
  const res = await fetch('/api/history')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function deleteReport(
  domain: string,
  userId?: string
): Promise<boolean> {
  if (isSupabaseConfigured() && supabase && userId) {
    const { error, count } = await supabase
      .from('reports')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('domain', domain)
    if (error) throw new Error(error.message)
    return (count ?? 0) > 0
  }

  // Fallback: local API
  const res = await fetch(`/api/history/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  })
  return res.ok
}

export async function getReportByDomain(
  domain: string,
  userId?: string
): Promise<ProspectReport | null> {
  if (isSupabaseConfigured() && supabase && userId) {
    const { data, error } = await supabase
      .from('reports')
      .select('report_data')
      .eq('user_id', userId)
      .eq('domain', domain)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? (data.report_data as unknown as ProspectReport) : null
  }

  // Fallback: local API
  const reports = await getReports()
  return reports.find((r) => r.company.domain === domain) ?? null
}
