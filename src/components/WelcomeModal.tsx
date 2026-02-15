import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Swords, Crosshair, UserSearch, Layers, Sparkles, ArrowRight } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'

interface WelcomeModalProps {
  onDismiss: () => void
  onTryExample: () => void
}

const FEATURES = [
  {
    icon: Search,
    label: 'Research',
    description: 'Deep-dive any company — SWOT, pain points, financials, key people, and outreach emails',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/20',
  },
  {
    icon: Swords,
    label: 'Compare',
    description: 'Side-by-side analysis of 2-5 companies across every dimension',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Crosshair,
    label: 'Discover',
    description: 'Find lookalike companies or match against your ideal customer profile',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: UserSearch,
    label: 'Talent',
    description: 'Recruiting intelligence — find candidates, assess fit, generate outreach',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Layers,
    label: 'Bulk',
    description: 'Research dozens of companies at once — paste domains or upload a CSV',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
]

export function WelcomeModal({ onDismiss, onTryExample }: WelcomeModalProps) {
  const hasSeenWelcome = useOnboarding((s) => s.hasSeenWelcome)
  const dismissWelcome = useOnboarding((s) => s.dismissWelcome)

  if (hasSeenWelcome) return null

  const handleDismiss = () => {
    dismissWelcome()
    onDismiss()
  }

  const handleTryExample = () => {
    dismissWelcome()
    onTryExample()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-gray-950/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-5 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20">
                <Sparkles className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">Welcome to ResearchAgent</h2>
                <p className="text-xs text-white/30">AI-powered business intelligence</p>
              </div>
            </div>

            {/* Value prop */}
            <p className="text-sm text-white/50 leading-relaxed mb-5">
              Research companies, compare competitors, discover prospects, and find talent — all powered by AI.
            </p>

            {/* All 5 features */}
            <div className="space-y-2 mb-6">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.label}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 ${feature.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${feature.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/70 mb-0.5">{feature.label}</div>
                      <div className="text-[11px] text-white/35 leading-snug">{feature.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleDismiss}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-500/40 transition-all"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={handleTryExample}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-xl text-sm font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:text-white/60 transition-all"
              >
                See example
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
