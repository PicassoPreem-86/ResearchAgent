import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Link2,
  Copy,
  Check,
  Trash2,
  Eye,
  MessageSquare,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { ShareLink } from '@/hooks/useCollaboration'

type ExpiryOption = '24h' | '7d' | '30d' | 'never'

interface ShareModalProps {
  reportId?: string
  workspaceId?: string
  shareLinks: ShareLink[]
  onCreateLink: (opts: {
    reportId?: string
    workspaceId?: string
    accessLevel?: 'view' | 'comment'
    expiresIn?: ExpiryOption
  }) => Promise<ShareLink>
  onRevokeLink: (id: string) => void
  onClose: () => void
}

export function ShareModal({
  reportId,
  workspaceId,
  shareLinks,
  onCreateLink,
  onRevokeLink,
  onClose,
}: ShareModalProps) {
  const [accessLevel, setAccessLevel] = useState<'view' | 'comment'>('view')
  const [expiry, setExpiry] = useState<ExpiryOption>('7d')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newLink, setNewLink] = useState<ShareLink | null>(null)

  const handleCreate = useCallback(async () => {
    setCreating(true)
    try {
      const link = await onCreateLink({
        reportId,
        workspaceId,
        accessLevel,
        expiresIn: expiry,
      })
      setNewLink(link)
    } catch {
      // handled upstream
    } finally {
      setCreating(false)
    }
  }, [reportId, workspaceId, accessLevel, expiry, onCreateLink])

  const handleCopy = useCallback(async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
    }
  }, [])

  const relevantLinks = shareLinks.filter(
    (l) => (reportId && l.id) || (workspaceId && l.id)
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-[#12121f] border border-white/[0.08] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-medium text-white/80">Share</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-white/20 hover:text-white/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Create new link */}
            {!newLink && (
              <div className="space-y-3">
                <p className="text-[11px] text-white/30">Generate a shareable link</p>

                {/* Access level */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAccessLevel('view')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                      accessLevel === 'view'
                        ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                        : 'border-white/[0.06] text-white/25 hover:text-white/40'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    View only
                  </button>
                  <button
                    onClick={() => setAccessLevel('comment')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                      accessLevel === 'comment'
                        ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                        : 'border-white/[0.06] text-white/25 hover:text-white/40'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Can comment
                  </button>
                </div>

                {/* Expiry */}
                <div>
                  <label className="text-[10px] text-white/20 font-medium block mb-1.5">Link expires in</label>
                  <div className="flex gap-1.5">
                    {(['24h', '7d', '30d', 'never'] as ExpiryOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setExpiry(opt)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          expiry === opt
                            ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                            : 'border-white/[0.06] text-white/20 hover:text-white/40'
                        }`}
                      >
                        {opt === 'never' ? 'Never' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500/15 text-brand-300 text-xs font-medium hover:bg-brand-500/25 disabled:opacity-40 transition-all"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  Generate link
                </button>
              </div>
            )}

            {/* Newly created link */}
            {newLink && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-2"
              >
                <p className="text-[10px] text-brand-300 font-medium">Link created</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink.url}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/50 outline-none"
                  />
                  <button
                    onClick={() => handleCopy(newLink)}
                    className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all"
                  >
                    {copiedId === newLink.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <button
                  onClick={() => setNewLink(null)}
                  className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Create another link
                </button>
              </motion.div>
            )}

            {/* Existing links */}
            {relevantLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/20 font-medium">Active links</p>
                {relevantLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] group"
                  >
                    <ExternalLink className="w-3 h-3 text-white/15 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/40 truncate">{link.url}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] text-white/15">
                          {link.accessLevel === 'comment' ? 'Can comment' : 'View only'}
                        </span>
                        <span className="text-[8px] text-white/15">
                          {link.viewCount} view{link.viewCount !== 1 ? 's' : ''}
                        </span>
                        {link.expiresAt && (
                          <span className="text-[8px] text-white/15">
                            Expires {new Date(link.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(link)}
                        className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                      >
                        {copiedId === link.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => onRevokeLink(link.id)}
                        className="p-1 rounded text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
