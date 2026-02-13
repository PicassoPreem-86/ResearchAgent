import { motion } from 'framer-motion'
import type { MarketPosition } from '@/types/prospect'

interface MarketPositionCardProps {
  market: MarketPosition
}

const MATURITY_STAGES = ['early', 'growing', 'mature', 'declining'] as const
const MATURITY_LABELS: Record<string, string> = {
  early: 'Early Stage',
  growing: 'Growing',
  mature: 'Mature',
  declining: 'Declining',
}

export function MarketPositionCard({ market }: MarketPositionCardProps) {
  const activeIndex = MATURITY_STAGES.indexOf(market.marketMaturity)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass p-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <div>
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5">Segment</div>
          <div className="text-sm font-medium text-white/70">{market.segment}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5">Pricing Tier</div>
          <div className="text-sm font-medium text-white/70">{market.pricingTier}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5">Target Audience</div>
          <div className="text-sm font-medium text-white/70">{market.targetAudience}</div>
        </div>
      </div>

      {/* Differentiators */}
      {market.differentiators.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Differentiators</div>
          <div className="flex flex-wrap gap-2">
            {market.differentiators.map((d, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300/70 font-medium"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Market maturity timeline */}
      <div>
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Market Maturity</div>
        <div className="flex items-center gap-1">
          {MATURITY_STAGES.map((stage, i) => {
            const isActive = i === activeIndex
            const isPast = i < activeIndex
            return (
              <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-center">
                  <div
                    className={`flex-1 h-1 rounded-full transition-colors ${
                      isPast || isActive ? 'bg-brand-500/40' : 'bg-white/[0.06]'
                    }`}
                  />
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${
                      isActive
                        ? 'bg-brand-400 border-brand-400 shadow-lg shadow-brand-400/30'
                        : isPast
                          ? 'bg-brand-500/40 border-brand-500/40'
                          : 'bg-white/[0.06] border-white/[0.08]'
                    }`}
                  />
                  <div
                    className={`flex-1 h-1 rounded-full transition-colors ${
                      isPast ? 'bg-brand-500/40' : 'bg-white/[0.06]'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-brand-300' : 'text-white/20'}`}>
                  {MATURITY_LABELS[stage]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
