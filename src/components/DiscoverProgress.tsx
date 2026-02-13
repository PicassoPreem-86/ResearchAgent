import { motion } from 'framer-motion'
import { Crosshair, Search, BarChart3, CheckCircle2 } from 'lucide-react'

interface DiscoverProgressProps {
  message: string
  progress: number
  companiesFound?: number
}

const STAGES = [
  { icon: Crosshair, label: 'Analyzing reference', threshold: 15 },
  { icon: Search, label: 'Searching companies', threshold: 40 },
  { icon: BarChart3, label: 'Scoring matches', threshold: 70 },
  { icon: CheckCircle2, label: 'Finalizing results', threshold: 90 },
]

export function DiscoverProgress({ message, progress, companiesFound }: DiscoverProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto text-center"
    >
      {/* Animated radar pulse */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-brand-500/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-brand-500/15"
          animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <Crosshair className="w-6 h-6 text-brand-400" />
          </div>
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-center gap-6 mb-8">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isActive = progress >= stage.threshold
          const isCurrent =
            progress >= stage.threshold &&
            (i === STAGES.length - 1 || progress < STAGES[i + 1].threshold)
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`p-2 rounded-lg border transition-all duration-500 ${
                  isCurrent
                    ? 'bg-brand-500/15 border-brand-500/30 shadow-lg shadow-brand-500/10'
                    : isActive
                    ? 'bg-white/[0.06] border-white/[0.1]'
                    : 'bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-500 ${
                    isCurrent ? 'text-brand-400' : isActive ? 'text-white/50' : 'text-white/15'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-500 ${
                  isCurrent ? 'text-brand-300' : isActive ? 'text-white/40' : 'text-white/15'
                }`}
              >
                {stage.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Message */}
      <motion.p
        key={message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-white/50 mb-2"
      >
        {message}
      </motion.p>

      {/* Companies found counter */}
      {companiesFound !== undefined && companiesFound > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-300">
            {companiesFound} companies found
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
