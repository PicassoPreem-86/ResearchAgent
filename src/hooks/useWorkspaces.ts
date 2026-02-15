import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Workspace {
  id: string
  name: string
  description: string | null
  created_at: string
  report_count?: number
}

export function useWorkspaces(userId?: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const enabled = isSupabaseConfigured() && !!userId

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, description, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      setWorkspaces(
        (data ?? []).map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          created_at: w.created_at,
          report_count: 0,
        }))
      )
    } finally {
      setIsLoading(false)
    }
  }, [enabled, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createWorkspace = useCallback(
    async (name: string, description?: string) => {
      if (!supabase || !userId) return
      const { error } = await supabase
        .from('workspaces')
        .insert({ user_id: userId, name, description: description ?? null })
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, userId, refresh]
  )

  const renameWorkspace = useCallback(
    async (id: string, name: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('workspaces')
        .update({ name })
        .eq('id', id)
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  const deleteWorkspace = useCallback(
    async (id: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  const addReportToWorkspace = useCallback(
    async (workspaceId: string, reportId: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('workspace_reports')
        .insert({ workspace_id: workspaceId, report_id: reportId })
      if (error && !error.message.includes('duplicate')) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  const removeReportFromWorkspace = useCallback(
    async (workspaceId: string, reportId: string) => {
      if (!supabase) return
      const { error } = await supabase
        .from('workspace_reports')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('report_id', reportId)
      if (error) throw new Error(error.message)
      await refresh()
    },
    [supabase, refresh]
  )

  return {
    workspaces,
    isLoading,
    enabled,
    refresh,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    addReportToWorkspace,
    removeReportFromWorkspace,
  }
}
