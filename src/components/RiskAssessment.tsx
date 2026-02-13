import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ChevronDown } from 'lucide-react'
import type { RiskAssessment as RiskAssessmentType } from '@/types/prospect'

interface RiskAssessmentProps {
  risks: RiskAssessmentType
}

const LEVEL_CONFIG = {
  low: {
    label: 'Low Risk',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  medium: {
    label: 'Medium Risk',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  high: {
    label: 'High Risk',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300',
  },
}

const SEVERITY_BADGE = {
  low: 'bg-emerald-500/15 text-emerald-300/70 border-emerald-500/20',
  medium: 'bg-amber-500/15 text-amber-300/70 border-amber-500/20',
  high: 'bg-red-500/15 text-red-300/70 border-red-500/20',
}

export function RiskAssessmentCard({ risks }: RiskAssessmentProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const config = LEVEL_CONFIG[risks.level]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass p-6 border-l-2 ${config.border}`}
    >
      {/* Overall level */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg ${config.bg} ${config.border} border`}>
          <ShieldAlert className={`w-5 h-5 ${config.text}`} />
        </div>
        <div>
          <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
          <span className="text-xs text-white/25 ml-2">{risks.flags.length} flag{risks.flags.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Flags */}
      <div className="space-y-2">
        {risks.flags.map((flag, i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <button
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full flex items-center gap-3 p-3.5 text-left"
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${SEVERITY_BADGE[flag.severity]}`}>
                {flag.severity}
              </span>
              <span className="text-sm font-medium text-white/70 flex-1">{flag.title}</span>
              <motion.div
                animate={{ rotate: expandedIndex === i ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-white/20" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedIndex === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3.5 pt-0">
                    <p className="text-xs text-white/40 leading-relaxed">{flag.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
