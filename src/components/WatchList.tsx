import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Trash2,
  ExternalLink,
  Clock,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Briefcase,
  DollarSign,
  Users,
  Swords,
  Info,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import type { WatchedCompany } from '@/hooks/useWatchList'
import type { ChangeReport, ChangeType } from '@/server/diff'

interface WatchListProps {
  isOpen: boolean
  onClose: () => void
  watched: WatchedCompany[]
  onRemove: (id: string) => void
  onViewReport: (domain: string) => void
  onCheckOne: (domain: string) => Promise<ChangeReport | null>
  onCheckAll: () => Promise<ChangeReport[]>
  isChecking: (domain: string) => boolean
  isCheckingAny: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function changeTypeIcon(type: ChangeType) {
  switch (type) {
    case 'new_risk':
    case 'resolved_risk':
      return <AlertTriangle className="w-3 h-3" />
    case 'hiring_change':
      return <Briefcase className="w-3 h-3" />
    case 'changed_value':
      return <DollarSign className="w-3 h-3" />
    case 'new_info':
      return <Info className="w-3 h-3" />
    case 'removed_info':
      return <X className="w-3 h-3" />
    case 'competitor_change':
      return <Swords className="w-3 h-3" />
    default:
      return <Info className="w-3 h-3" />
  }
}

function changeTypeColor(type: ChangeType): string {
  switch (type) {
    case 'new_risk':
      return 'text-red-400'
    case 'resolved_risk':
      return 'text-green-400'
    case 'hiring_change':
      return 'text-blue-400'
    case 'changed_value':
      return 'text-amber-400'
    case 'competitor_change':
      return 'text-purple-400'
    case 'new_info':
      return 'text-cyan-400'
    case 'removed_info':
      return 'text-white/40'
    default:
      return 'text-white/50'
  }
}

function significanceBadge(significance: ChangeReport['significance'], count: number) {
  if (significance === 'none' || count === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-[10px] font-medium text-green-400">
        <CheckCircle className="w-2.5 h-2.5" />
        No changes
      </span>
    )
  }
  if (significance === 'major') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 text-[10px] font-medium text-red-400">
        <AlertTriangle className="w-2.5 h-2.5" />
        {count} change{count !== 1 ? 's' : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-medium text-amber-400">
      {count} change{count !== 1 ? 's' : ''}
    </span>
  )
}

export function WatchList({
  isOpen,
  onClose,
  watched,
  onRemove,
  onViewReport,
  onCheckOne,
  onCheckAll,
  isChecking,
  isCheckingAny,
}: WatchListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-950 border-l border-white/[0.06] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white/80">Watch List</h2>
                {watched.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-brand-500/10 text-[10px] font-medium text-brand-300">
                    {watched.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {watched.length > 0 && (
                  <button
                    onClick={() => onCheckAll()}
                    disabled={isCheckingAny}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCheckingAny ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Check All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {watched.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Eye className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-sm text-white/30 mb-1">No watched companies</p>
                  <p className="text-xs text-white/15">
                    Click &quot;Watch&quot; on any research report to track changes
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {watched.map((company) => {
                    const checking = isChecking(company.domain)
                    const expanded = expandedId === company.id
                    const changes = company.lastChanges

                    return (
                      <motion.div
                        key={company.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all overflow-hidden"
                      >
                        {/* Company row */}
                        <div className="flex items-center justify-between px-3.5 py-3 group">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onViewReport(company.domain)}
                                className="text-sm font-medium text-white/70 hover:text-white/90 transition-colors truncate"
                              >
                                {company.domain}
                              </button>
                              {changes && significanceBadge(changes.significance, changes.changesDetected)}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {company.lastCheckedAt && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-white/15" />
                                  <span className="text-[10px] text-white/20">
                                    Checked {timeAgo(company.lastCheckedAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Expand changes */}
                            {changes && changes.changesDetected > 0 && (
                              <button
                                onClick={() => setExpandedId(expanded ? null : company.id)}
                                className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all"
                                title="View changes"
                              >
                                {expanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            )}

                            {/* Check now */}
                            <button
                              onClick={() => onCheckOne(company.domain)}
                              disabled={checking}
                              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all disabled:opacity-40"
                              title="Check for changes"
                            >
                              {checking ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                            </button>

                            {/* View report */}
                            <button
                              onClick={() => onViewReport(company.domain)}
                              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
                              title="View report"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>

                            {/* Remove */}
                            <button
                              onClick={() => onRemove(company.id)}
                              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                              title="Remove from watch list"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded change details */}
                        <AnimatePresence>
                          {expanded && changes && changes.changes.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3.5 pb-3 border-t border-white/[0.04]">
                                <p className="text-[10px] text-white/25 mt-2 mb-1.5 uppercase tracking-wider font-medium">
                                  Changes
                                </p>
                                <div className="space-y-1">
                                  {changes.changes.map((change, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 text-[11px] py-1 px-2 rounded-lg bg-white/[0.02]"
                                    >
                                      <span className={`mt-0.5 flex-shrink-0 ${changeTypeColor(change.type)}`}>
                                        {changeTypeIcon(change.type)}
                                      </span>
                                      <span className="text-white/50">{change.description}</span>
                                    </div>
                                  ))}
                                </div>
                                {changes.checkedAt && (
                                  <p className="text-[9px] text-white/15 mt-2">
                                    Last checked: {new Date(changes.checkedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer summary */}
            {watched.length > 0 && (
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/20">
                      <Users className="w-3 h-3 inline mr-1" />
                      {watched.length} compan{watched.length === 1 ? 'y' : 'ies'}
                    </span>
                    {(() => {
                      const withChanges = watched.filter(
                        (w) => w.lastChanges && w.lastChanges.changesDetected > 0
                      ).length
                      if (withChanges > 0) {
                        return (
                          <span className="text-[10px] text-amber-400/60">
                            {withChanges} with changes
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
