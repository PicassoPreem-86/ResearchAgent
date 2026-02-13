import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Crosshair, X } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'

interface PostResearchNudgeProps {
  companyDomain: string
  onSwitchMode: (mode: 'compare' | 'discover') => void
}

export function PostResearchNudge({ companyDomain, onSwitchMode }: PostResearchNudgeProps) {
  const { completedResearchCount, hasSeenPostResearchNudge, dismissPostResearchNudge } = useOnboarding()

  // Show only after first research and only once
  if (completedResearchCount < 1 || hasSeenPostResearchNudge) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="w-full max-w-4xl mx-auto mt-6 mb-4"
      >
        <div className="relative glass p-4 border border-brand-500/10">
          <button
            onClick={dismissPostResearchNudge}
            className="absolute top-3 right-3 p-1 rounded text-white/20 hover:text-white/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Keep going</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                dismissPostResearchNudge()
                onSwitchMode('compare')
              }}
              className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 shrink-0">
                <Swords className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/60">Compare against competitors</div>
                <div className="text-[11px] text-white/25">See how {companyDomain} stacks up side by side</div>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                dismissPostResearchNudge()
                onSwitchMode('discover')
              }}
              className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                <Crosshair className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/60">Find similar companies</div>
                <div className="text-[11px] text-white/25">Discover lookalikes based on {companyDomain}</div>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
