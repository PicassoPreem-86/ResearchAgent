import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, X, Circle, Globe } from 'lucide-react'
import type { DomainResult } from '@/hooks/useBulkResearch'

interface BulkProgressProps {
  domainResults: DomainResult[]
  currentIndex: number
  total: number
  message: string
}

function StatusIcon({ status }: { status: DomainResult['status'] }) {
  switch (status) {
    case 'processing':
      return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
    case 'complete':
      return (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
          <Check className="w-4 h-4 text-emerald-400" />
        </motion.div>
      )
    case 'error':
      return (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <X className="w-4 h-4 text-red-400" />
        </motion.div>
      )
    default:
      return <Circle className="w-4 h-4 text-white/15" />
  }
}

export function BulkProgress({ domainResults, currentIndex, total, message }: BulkProgressProps) {
  const completedCount = domainResults.filter((d) => d.status === 'complete').length
  const errorCount = domainResults.filter((d) => d.status === 'error').length
  const processedCount = completedCount + errorCount
  const progressPercent = total > 0 ? (processedCount / total) * 100 : 0

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current && currentIndex >= 0) {
      const activeItem = listRef.current.children[currentIndex] as HTMLElement | undefined
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [currentIndex])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4"
        >
          <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
          <span className="text-xs font-medium text-brand-300">Bulk Research</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white/90 mb-2">
          Researching {processedCount} of {total}
        </h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-white/40"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <div className="flex items-center gap-3">
            {completedCount > 0 && (
              <span className="text-xs text-emerald-400/60">
                {completedCount} done
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-xs text-red-400/60">
                {errorCount} failed
              </span>
            )}
          </div>
          <span className="text-xs text-white/30 font-mono">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Domain list */}
      <div className="glass p-2 max-h-[400px] overflow-y-auto" ref={listRef}>
        {domainResults.map((dr, i) => (
          <motion.div
            key={dr.domain}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.03, 1) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              dr.status === 'processing' ? 'glass glow-sm' : ''
            }`}
          >
            <StatusIcon status={dr.status} />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Globe className={`w-3.5 h-3.5 shrink-0 ${
                dr.status === 'processing' ? 'text-brand-400/60' :
                dr.status === 'complete' ? 'text-emerald-400/40' :
                dr.status === 'error' ? 'text-red-400/40' :
                'text-white/15'
              }`} />
              <span className={`text-sm font-medium truncate ${
                dr.status === 'processing' ? 'text-white/80' :
                dr.status === 'complete' ? 'text-white/60' :
                dr.status === 'error' ? 'text-red-300/60' :
                'text-white/25'
              }`}>
                {dr.domain}
              </span>
            </div>
            {dr.status === 'complete' && dr.report && (
              <span className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-wider shrink-0">
                {dr.report.company.name}
              </span>
            )}
            {dr.status === 'error' && (
              <span className="text-[10px] text-red-400/50 font-medium uppercase tracking-wider shrink-0">
                Failed
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
