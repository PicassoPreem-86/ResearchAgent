import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Lightbulb, ShieldAlert } from 'lucide-react'
import type { SwotAnalysis } from '@/types/prospect'

interface SwotGridProps {
  swot: SwotAnalysis
}

const QUADRANTS = [
  {
    key: 'strengths' as const,
    label: 'Strengths',
    icon: TrendingUp,
    accent: 'border-t-emerald-500/60',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    titleColor: 'text-emerald-300/90',
    textColor: 'text-emerald-200/40',
  },
  {
    key: 'weaknesses' as const,
    label: 'Weaknesses',
    icon: TrendingDown,
    accent: 'border-t-red-500/60',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10',
    titleColor: 'text-red-300/90',
    textColor: 'text-red-200/40',
  },
  {
    key: 'opportunities' as const,
    label: 'Opportunities',
    icon: Lightbulb,
    accent: 'border-t-blue-500/60',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    titleColor: 'text-blue-300/90',
    textColor: 'text-blue-200/40',
  },
  {
    key: 'threats' as const,
    label: 'Threats',
    icon: ShieldAlert,
    accent: 'border-t-amber-500/60',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    titleColor: 'text-amber-300/90',
    textColor: 'text-amber-200/40',
  },
]

export function SwotGrid({ swot }: SwotGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {QUADRANTS.map((q, qi) => {
        const Icon = q.icon
        const items = swot[q.key]
        return (
          <motion.div
            key={q.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: qi * 0.1 }}
            className={`glass p-5 border-t-2 ${q.accent}`}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`p-1.5 rounded-lg ${q.iconBg}`}>
                <Icon className={`w-4 h-4 ${q.iconColor}`} />
              </div>
              <h4 className={`text-sm font-semibold ${q.titleColor}`}>{q.label}</h4>
              <span className="text-[10px] text-white/20 ml-auto">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i}>
                  <div className="text-xs font-semibold text-white/70 mb-1">{item.title}</div>
                  <p className="text-xs text-white/40 leading-relaxed mb-1.5">{item.description}</p>
                  {item.evidence && (
                    <p className={`text-[11px] ${q.textColor} leading-relaxed italic`}>
                      {item.evidence}
                    </p>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-white/15 italic">No data available</p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
