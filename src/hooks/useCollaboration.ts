import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'

export interface WorkspaceMember {
  id: string
  userId: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  invitedAt: string
  acceptedAt: string | null
}

export interface Comment {
  id: string
  userId: string
  userEmail: string
  reportDomain: string
  section: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface ShareLink {
  id: string
  token: string
  accessLevel: 'view' | 'comment'
  expiresAt: string | null
  viewCount: number
  createdAt: string
  url: string
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || res.statusText)
  }
  return res.json()
}

export function useCollaboration(workspaceId?: string) {
  const { user } = useAuth()

  // Members
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return
    setMembersLoading(true)
    try {
      const res = await apiFetch<{ members: WorkspaceMember[] }>(`/api/workspaces/${workspaceId}/members`)
      setMembers(res.members)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [workspaceId])

  const addMember = useCallback(async (email: string, role: 'editor' | 'viewer' = 'viewer') => {
    if (!workspaceId) return
    await apiFetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
    await loadMembers()
  }, [workspaceId, loadMembers])

  const updateMemberRole = useCallback(async (userId: string, role: 'editor' | 'viewer') => {
    if (!workspaceId) return
    await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    await loadMembers()
  }, [workspaceId, loadMembers])

  const removeMember = useCallback(async (userId: string) => {
    if (!workspaceId) return
    await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    })
    await loadMembers()
  }, [workspaceId, loadMembers])

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const loadComments = useCallback(async (domain?: string, section?: string) => {
    if (!workspaceId) return
    setCommentsLoading(true)
    try {
      const params = new URLSearchParams()
      if (domain) params.set('domain', domain)
      if (section) params.set('section', section)
      const qs = params.toString()
      const res = await apiFetch<{ comments: Comment[] }>(
        `/api/workspaces/${workspaceId}/comments${qs ? `?${qs}` : ''}`
      )
      setComments(res.comments)
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }, [workspaceId])

  const addComment = useCallback(async (reportDomain: string, content: string, section?: string) => {
    if (!workspaceId) return
    await apiFetch(`/api/workspaces/${workspaceId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ reportDomain, content, section }),
    })
    await loadComments(reportDomain)
  }, [workspaceId, loadComments])

  const deleteComment = useCallback(async (commentId: string, reportDomain?: string) => {
    await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (reportDomain) await loadComments(reportDomain)
  }, [loadComments])

  // Share links
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])

  const createShareLink = useCallback(async (opts: {
    reportId?: string
    workspaceId?: string
    accessLevel?: 'view' | 'comment'
    expiresIn?: '24h' | '7d' | '30d' | 'never'
  }): Promise<ShareLink> => {
    const res = await apiFetch<ShareLink>('/api/share', {
      method: 'POST',
      body: JSON.stringify({
        reportId: opts.reportId,
        workspaceId: opts.workspaceId,
        accessLevel: opts.accessLevel || 'view',
        expiresIn: opts.expiresIn === 'never' ? undefined : opts.expiresIn,
      }),
    })
    setShareLinks((prev) => [res, ...prev])
    return res
  }, [])

  const revokeShareLink = useCallback(async (linkId: string) => {
    await apiFetch(`/api/share/${linkId}`, { method: 'DELETE' })
    setShareLinks((prev) => prev.filter((l) => l.id !== linkId))
  }, [])

  // Load members on workspace change
  useEffect(() => {
    if (workspaceId && user) {
      loadMembers()
    }
  }, [workspaceId, user, loadMembers])

  const myRole = members.find((m) => m.userId === user?.id)?.role ?? null

  return {
    // Members
    members,
    membersLoading,
    loadMembers,
    addMember,
    updateMemberRole,
    removeMember,
    myRole,

    // Comments
    comments,
    commentsLoading,
    loadComments,
    addComment,
    deleteComment,

    // Share links
    shareLinks,
    createShareLink,
    revokeShareLink,
  }
}
