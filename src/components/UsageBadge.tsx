import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, X } from 'lucide-react'
import { useState } from 'react'

interface UsageStats {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

interface Quotas {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

interface UsageBadgeProps {
  usage: UsageStats
  quotas: Quotas
  label: string
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = Math.min((used / total) * 100, 100)
  const isNearLimit = pct >= 80
  const isAtLimit = pct >= 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/40">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-white/50'}`}>
          {used}/{total}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-brand-500'
          }`}
        />
      </div>
    </div>
  )
}

export function UsageBadge({ usage, quotas, label }: UsageBadgeProps) {
  const [showDetail, setShowDetail] = useState(false)

  if (!label) return null

  const total = usage.researches + usage.comparisons + usage.discovers + usage.talents
  const totalQuota = quotas.researches + quotas.comparisons + quotas.discovers + quotas.talents
  const pct = Math.min((total / totalQuota) * 100, 100)
  const isNearLimit = pct >= 80

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
          isNearLimit
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
            : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50'
        }`}
      >
        <BarChart3 className="w-3 h-3" />
        <span>{label}</span>
      </button>

      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/60">Monthly Usage</span>
              <button onClick={() => setShowDetail(false)} className="text-white/20 hover:text-white/40">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              <UsageBar used={usage.researches} total={quotas.researches} label="Research" />
              <UsageBar used={usage.comparisons} total={quotas.comparisons} label="Compare" />
              <UsageBar used={usage.discovers} total={quotas.discovers} label="Discover" />
              <UsageBar used={usage.talents} total={quotas.talents} label="Talent" />
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/20 text-center">
                Free tier · Resets monthly
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
