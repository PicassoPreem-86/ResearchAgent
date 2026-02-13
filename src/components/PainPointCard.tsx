import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { PainPoint } from '@/types/prospect'

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badge: 'bg-red-500/20 text-red-300',
    label: 'High',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-300',
    label: 'Medium',
  },
  low: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-300',
    label: 'Low',
  },
}

interface PainPointCardProps {
  painPoint: PainPoint
  index: number
}

export function PainPointCard({ painPoint, index }: PainPointCardProps) {
  const config = severityConfig[painPoint.severity]
  const Icon = config.icon

  const confidence = painPoint.confidence != null ? Math.max(0, Math.min(100, Math.round(painPoint.confidence))) : null
  const confColor =
    confidence !== null
      ? confidence >= 80 ? 'text-emerald-400/60' : confidence >= 50 ? 'text-amber-400/60' : 'text-red-400/60'
      : ''
  const confBg =
    confidence !== null
      ? confidence >= 80 ? 'bg-emerald-500/10' : confidence >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'
      : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`glass glass-hover p-5 group`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg} ${config.border} border shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <h4 className="text-sm font-semibold text-white/90 truncate">{painPoint.title}</h4>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badge} shrink-0`}>
              {config.label}
            </span>
            {confidence !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confBg} ${confColor} shrink-0`}>
                {confidence}%
              </span>
            )}
          </div>
          <p className="text-sm text-white/50 leading-relaxed mb-3">{painPoint.description}</p>
          <div className={`text-xs text-white/35 leading-relaxed pl-3 border-l-2 ${config.border}`}>
            <span className="text-white/25 text-[10px] uppercase tracking-wider font-medium block mb-1">Evidence</span>
            {painPoint.evidence}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
