import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, BarChart3, AlertTriangle, Mail, Users, Sparkles } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'

interface WelcomeModalProps {
  onDismiss: () => void
  onTryExample: () => void
}

const REPORT_SECTIONS = [
  { icon: Search, label: 'Company Intel', color: 'text-brand-400' },
  { icon: BarChart3, label: 'SWOT Analysis', color: 'text-cyan-400' },
  { icon: AlertTriangle, label: 'Pain Points', color: 'text-amber-400' },
  { icon: Users, label: 'Key People', color: 'text-emerald-400' },
  { icon: Mail, label: 'Outreach Emails', color: 'text-brand-400' },
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

          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20">
                <Sparkles className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/90">Welcome to ResearchAgent</h2>
                <p className="text-xs text-white/30">AI-powered business intelligence</p>
              </div>
            </div>

            {/* Value prop */}
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Enter any company domain and get a full intelligence report in seconds — SWOT analysis, pain points, key decision-makers, financial signals, and ready-to-send outreach emails.
            </p>

            {/* What you'll get */}
            <div className="mb-6">
              <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Every report includes</div>
              <div className="grid grid-cols-5 gap-2">
                {REPORT_SECTIONS.map((section) => {
                  const Icon = section.icon
                  return (
                    <div
                      key={section.label}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                    >
                      <Icon className={`w-4 h-4 ${section.color}`} />
                      <span className="text-[10px] text-white/40 font-medium text-center leading-tight">{section.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* How it works - 3 steps */}
            <div className="mb-8">
              <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">How it works</div>
              <div className="flex items-start gap-3">
                {[
                  { step: '1', text: 'Pick a research lens' },
                  { step: '2', text: 'Enter a company domain' },
                  { step: '3', text: 'Get your full report' },
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-brand-400">{item.step}</span>
                    </div>
                    <span className="text-xs text-white/40 leading-snug">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleDismiss}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-500/40 transition-all"
              >
                <Search className="w-4 h-4" />
                Research my first company
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
