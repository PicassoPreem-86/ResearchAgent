import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Swords } from 'lucide-react'

interface ComparisonProgressProps {
  message: string
  progress: number
}

export function ComparisonProgress({ message, progress }: ComparisonProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4"
        >
          <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
          <span className="text-xs font-medium text-brand-300">Comparing</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white/90 mb-2">Comparison in progress</h2>
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

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-white/25">Researching & comparing...</span>
          <span className="text-xs text-white/30 font-mono">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Visual */}
      <div className="flex justify-center">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="p-6 rounded-full bg-brand-500/5 border border-brand-500/10"
        >
          <Swords className="w-10 h-10 text-brand-400/30" />
        </motion.div>
      </div>
    </motion.div>
  )
}
