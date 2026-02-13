import { motion } from 'framer-motion'
import { Building2, Users, UserSearch, BarChart3, Mail } from 'lucide-react'

interface TalentProgressProps {
  message: string
  progress: number
  companyName?: string
}

const STAGES = [
  { icon: Building2, label: 'Researching company', threshold: 15 },
  { icon: Users, label: 'Extracting team', threshold: 35 },
  { icon: UserSearch, label: 'Enriching profiles', threshold: 55 },
  { icon: BarChart3, label: 'Analyzing fit', threshold: 70 },
  { icon: Mail, label: 'Recruiting strategy', threshold: 85 },
]

export function TalentProgress({ message, progress, companyName }: TalentProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto text-center"
    >
      {/* Animated search icon */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/10"
          animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <UserSearch className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Company name being searched */}
      {companyName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <span className="text-xs text-white/25 uppercase tracking-wider font-semibold">Searching</span>
          <p className="text-sm font-semibold text-white/60 mt-1">{companyName}</p>
        </motion.div>
      )}

      {/* Stage indicators */}
      <div className="flex items-center justify-center gap-4 mb-8">
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
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`p-2 rounded-lg border transition-all duration-500 ${
                  isCurrent
                    ? 'bg-cyan-500/15 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : isActive
                    ? 'bg-white/[0.06] border-white/[0.1]'
                    : 'bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors duration-500 ${
                    isCurrent ? 'text-cyan-400' : isActive ? 'text-white/50' : 'text-white/15'
                  }`}
                />
              </div>
              <span
                className={`text-[9px] font-medium transition-colors duration-500 max-w-[60px] text-center leading-tight ${
                  isCurrent ? 'text-cyan-300' : isActive ? 'text-white/40' : 'text-white/15'
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
          className="h-full bg-gradient-to-r from-cyan-600 to-brand-400 rounded-full"
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
        className="text-sm text-white/50"
      >
        {message}
      </motion.p>
    </motion.div>
  )
}
