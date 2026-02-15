import { motion } from 'framer-motion'
import { Clock, Globe, CheckCircle, XCircle } from 'lucide-react'
import type { DataFreshness } from '@/types/prospect'

export function getFreshnessColor(dateStr: string): { bg: string; text: string; label: string } {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24))

  if (days < 7) return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Fresh' }
  if (days < 30) return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Recent' }
  return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'Stale' }
}

interface DataFreshnessBarProps {
  freshness: DataFreshness
}

export function DataFreshnessBar({ freshness }: DataFreshnessBarProps) {
  const color = getFreshnessColor(freshness.newestSource)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border ${color.bg} mb-6`}
    >
      <div className="flex items-center gap-2">
        <Globe className={`w-4 h-4 ${color.text}`} />
        <span className="text-xs font-semibold text-white/60">
          Based on {freshness.totalPagesSuccessful} page{freshness.totalPagesSuccessful !== 1 ? 's' : ''} scraped
        </span>
      </div>

      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
        <Clock className="w-3 h-3" />
        {color.label}
      </div>

      {freshness.totalPagesFetched > freshness.totalPagesSuccessful && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <CheckCircle className="w-3 h-3 text-emerald-400/50" />
          {freshness.totalPagesSuccessful}
          <XCircle className="w-3 h-3 text-red-400/50 ml-1" />
          {freshness.totalPagesFetched - freshness.totalPagesSuccessful}
        </div>
      )}
    </motion.div>
  )
}
