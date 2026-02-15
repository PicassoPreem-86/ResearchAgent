import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderPlus, Folder, Loader2, Check, X, Users } from 'lucide-react'
import type { Workspace } from '@/hooks/useWorkspaces'

interface WorkspaceSelectorProps {
  workspaces: Workspace[]
  isLoading: boolean
  activeWorkspaceId: string | null
  memberCounts?: Record<string, number>
  onSelect: (id: string | null) => void
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onOpenCollab?: (workspaceId: string) => void
}

export function WorkspaceSelector({
  workspaces,
  isLoading: _isLoading,
  activeWorkspaceId,
  memberCounts,
  onSelect,
  onCreate,
  onDelete,
  onOpenCollab,
}: WorkspaceSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await onCreate(newName.trim())
      setNewName('')
      setIsCreating(false)
    } finally {
      setSaving(false)
    }
  }

  if (workspaces.length === 0 && !isCreating) {
    return (
      <div className="px-4 py-2 border-b border-white/[0.06]">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-white/40 transition-colors"
        >
          <FolderPlus className="w-3 h-3" />
          Create workspace
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-white/[0.06]">
      <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
            activeWorkspaceId === null
              ? 'bg-white/[0.08] text-white/70'
              : 'text-white/25 hover:text-white/40'
          }`}
        >
          All
        </button>
        {workspaces.map((ws) => (
          <div key={ws.id} className="shrink-0 relative group flex items-center">
            <button
              onClick={() => onSelect(ws.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                activeWorkspaceId === ws.id
                  ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                  : 'text-white/25 hover:text-white/40'
              }`}
            >
              <Folder className="w-2.5 h-2.5" />
              <span className="max-w-[80px] truncate">{ws.name}</span>
              {ws.report_count !== undefined && ws.report_count > 0 && (
                <span className="text-[8px] text-white/15">{ws.report_count}</span>
              )}
              {memberCounts && memberCounts[ws.id] > 0 && (
                <span className="flex items-center gap-0.5 text-[8px] text-white/15">
                  <Users className="w-2 h-2" />
                  {memberCounts[ws.id]}
                </span>
              )}
            </button>
            {onOpenCollab && activeWorkspaceId === ws.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCollab(ws.id)
                }}
                className="ml-0.5 p-1 rounded-lg text-white/15 hover:text-brand-300 hover:bg-brand-500/10 transition-all"
                title="Collaboration"
              >
                <Users className="w-2.5 h-2.5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(ws.id)
              }}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-gray-900 border border-white/[0.08] text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-2 h-2" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setIsCreating(true)}
          className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-white/15 hover:text-white/30 transition-colors"
        >
          <FolderPlus className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Workspace name..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/15 outline-none focus:border-brand-500/30 transition-all"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 disabled:opacity-30 hover:bg-brand-500/20 transition-all"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewName('') }}
                className="p-1.5 rounded-lg text-white/20 hover:text-white/40 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
