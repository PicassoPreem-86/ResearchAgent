import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Trash2, ExternalLink, Clock, X } from 'lucide-react'
import type { WatchedCompany } from '@/hooks/useWatchList'

interface WatchListProps {
  isOpen: boolean
  onClose: () => void
  watched: WatchedCompany[]
  onRemove: (id: string) => void
  onViewReport: (domain: string) => void
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

export function WatchList({ isOpen, onClose, watched, onRemove, onViewReport }: WatchListProps) {
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-gray-950 border-l border-white/[0.06] z-50 flex flex-col"
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
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {watched.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Eye className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-sm text-white/30 mb-1">No watched companies</p>
                  <p className="text-xs text-white/15">
                    Click "Watch" on any research report to track changes
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {watched.map((company) => (
                    <motion.div
                      key={company.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="group flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => onViewReport(company.domain)}
                          className="text-sm font-medium text-white/70 hover:text-white/90 transition-colors truncate block"
                        >
                          {company.domain}
                        </button>
                        {company.lastCheckedAt && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-white/15" />
                            <span className="text-[10px] text-white/20">
                              Checked {timeAgo(company.lastCheckedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onViewReport(company.domain)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all"
                          title="View report"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemove(company.id)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Remove from watch list"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
