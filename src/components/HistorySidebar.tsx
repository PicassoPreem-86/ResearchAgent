import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X, Trash2, Building2, Globe, Loader2, Inbox } from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'

interface HistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  history: ProspectReport[]
  isLoading: boolean
  onLoadReport: (report: ProspectReport) => void
  onDeleteReport: (domain: string) => Promise<void>
}

function HistoryItem({
  report,
  onLoad,
  onDelete,
}: {
  report: ProspectReport
  onLoad: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setIsDeleting(true)
    onDelete()
  }

  const date = new Date(report.researchedAt)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
      className="group"
    >
      <button
        onClick={onLoad}
        className="w-full text-left p-3 rounded-xl glass glass-hover transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white/80 truncate mb-0.5">
              {report.company.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Globe className="w-3 h-3" />
              <span className="truncate">{report.company.domain}</span>
            </div>
            <div className="text-[10px] text-white/20 mt-1">
              {dateStr} at {timeStr}
            </div>
          </div>
          <motion.button
            onClick={handleDelete}
            disabled={isDeleting}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0 ${
              confirmDelete
                ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                : 'bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50'
            }`}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </motion.button>
        </div>
      </button>
    </motion.div>
  )
}

export function HistorySidebar({
  isOpen,
  onClose,
  history,
  isLoading,
  onLoadReport,
  onDeleteReport,
}: HistorySidebarProps) {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-[360px] max-w-[85vw] z-50 bg-gray-950/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <Clock className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Research History</h3>
                  <p className="text-[10px] text-white/25">{history.length} report{history.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(100vh - 70px)' }}>
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                </div>
              )}

              {!isLoading && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <Inbox className="w-8 h-8 text-white/15" />
                  </div>
                  <p className="text-sm text-white/30 font-medium mb-1">No history yet</p>
                  <p className="text-xs text-white/15">Research results will appear here</p>
                </div>
              )}

              <AnimatePresence>
                {history.map((report) => (
                  <HistoryItem
                    key={`${report.company.domain}-${report.researchedAt}`}
                    report={report}
                    onLoad={() => {
                      onLoadReport(report)
                      onClose()
                    }}
                    onDelete={() => onDeleteReport(report.company.domain)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
