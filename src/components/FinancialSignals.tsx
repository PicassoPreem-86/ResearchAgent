import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Rocket, Users } from 'lucide-react'
import type { FinancialSignals as FinancialSignalsType } from '@/types/prospect'

interface FinancialSignalsProps {
  signals: FinancialSignalsType
}

export function FinancialSignalsCard({ signals }: FinancialSignalsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass p-6"
    >
      {/* Top stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 shrink-0">
            <Rocket className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-0.5">Funding</div>
            <div className="text-sm font-semibold text-white/80">{signals.fundingStage || 'Unknown'}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-0.5">Revenue</div>
            <div className="text-sm font-semibold text-white/80">{signals.estimatedRevenue || 'Unknown'}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-0.5">Hiring</div>
            <div className="text-sm font-semibold text-white/80">{signals.hiringVelocity || 'Unknown'}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-0.5">Growth</div>
            <div className="text-sm font-semibold text-white/80">{signals.growthIndicators.length} signal{signals.growthIndicators.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Growth indicators */}
      {signals.growthIndicators.length > 0 && (
        <div>
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Growth Indicators</div>
          <div className="space-y-1.5">
            {signals.growthIndicators.map((indicator, i) => (
              <div key={i} className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-400/50 shrink-0" />
                <span className="text-xs text-white/45 leading-relaxed">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
