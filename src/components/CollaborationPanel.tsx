import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  MessageSquare,
  UserPlus,
  X,
  Trash2,
  Send,
  Shield,
  Edit3,
  Eye,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import type { WorkspaceMember, Comment } from '@/hooks/useCollaboration'

type Tab = 'members' | 'comments'

interface CollaborationPanelProps {
  workspaceId: string
  workspaceName: string
  members: WorkspaceMember[]
  membersLoading: boolean
  comments: Comment[]
  commentsLoading: boolean
  myRole: 'owner' | 'editor' | 'viewer' | null
  currentDomain?: string
  onAddMember: (email: string, role: 'editor' | 'viewer') => Promise<void>
  onUpdateRole: (userId: string, role: 'editor' | 'viewer') => void
  onRemoveMember: (userId: string) => void
  onAddComment: (domain: string, content: string, section?: string) => Promise<void>
  onDeleteComment: (commentId: string, domain?: string) => void
  onClose: () => void
}

const ROLE_ICONS = {
  owner: Shield,
  editor: Edit3,
  viewer: Eye,
}

const ROLE_COLORS = {
  owner: 'text-amber-400 bg-amber-400/10',
  editor: 'text-blue-400 bg-blue-400/10',
  viewer: 'text-white/30 bg-white/[0.04]',
}

export function CollaborationPanel({
  workspaceName,
  members,
  membersLoading,
  comments,
  commentsLoading,
  myRole,
  currentDomain,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
  onAddComment,
  onDeleteComment,
  onClose,
}: CollaborationPanelProps) {
  const [tab, setTab] = useState<Tab>('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    try {
      await onAddMember(inviteEmail.trim(), inviteRole)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, inviteRole, onAddMember])

  const handleComment = useCallback(async () => {
    if (!commentText.trim() || !currentDomain) return
    setCommenting(true)
    try {
      await onAddComment(currentDomain, commentText.trim())
      setCommentText('')
    } catch {
      // silently fail
    } finally {
      setCommenting(false)
    }
  }, [commentText, currentDomain, onAddComment])

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-[#0e0e1a]/95 backdrop-blur-xl border-l border-white/[0.06] z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-xs font-medium text-white/70 truncate">{workspaceName}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-white/20 hover:text-white/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {([
          { key: 'members' as Tab, label: 'Members', icon: Users, count: members.length },
          { key: 'comments' as Tab, label: 'Comments', icon: MessageSquare, count: comments.length },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all border-b-2 ${
              tab === key
                ? 'border-brand-400 text-brand-300'
                : 'border-transparent text-white/25 hover:text-white/40'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06]">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3"
            >
              {/* Invite form (owners only) */}
              {myRole === 'owner' && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-medium">
                    <UserPlus className="w-3 h-3" />
                    Invite member
                  </div>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    placeholder="Email address..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/15 outline-none focus:border-brand-500/30 transition-all"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/50 outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={!inviteEmail.trim() || inviting}
                      className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-[10px] font-medium disabled:opacity-30 hover:bg-brand-500/20 transition-all"
                    >
                      {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite'}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-red-400">{inviteError}</p>
                  )}
                </div>
              )}

              {/* Members list */}
              {membersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-[11px] text-white/20 py-6">No members yet</p>
              ) : (
                <div className="space-y-1">
                  {members.map((m) => {
                    const RoleIcon = ROLE_ICONS[m.role]
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-medium shrink-0">
                          {m.email[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/60 truncate">{m.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${ROLE_COLORS[m.role]}`}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {m.role}
                          </span>
                          {myRole === 'owner' && m.role !== 'owner' && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onUpdateRole(m.userId, m.role === 'editor' ? 'viewer' : 'editor')}
                                className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                                title={m.role === 'editor' ? 'Demote to viewer' : 'Promote to editor'}
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onRemoveMember(m.userId)}
                                className="p-1 rounded text-white/20 hover:text-red-400 transition-colors"
                                title="Remove member"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'comments' && (
            <motion.div
              key="comments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {commentsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-[11px] text-white/20 py-6">
                    {currentDomain ? 'No comments on this report' : 'Select a report to view comments'}
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40 font-medium">{c.userEmail}</span>
                        <div className="flex items-center gap-1">
                          {c.section && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">{c.section}</span>
                          )}
                          <button
                            onClick={() => onDeleteComment(c.id, c.reportDomain)}
                            className="p-0.5 rounded text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">{c.content}</p>
                      <p className="text-[9px] text-white/15 mt-1">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment */}
              {currentDomain && myRole && myRole !== 'viewer' && (
                <div className="p-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                      placeholder="Add a comment..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/15 outline-none focus:border-brand-500/30 transition-all"
                    />
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim() || commenting}
                      className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 disabled:opacity-30 hover:bg-brand-500/20 transition-all"
                    >
                      {commenting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
