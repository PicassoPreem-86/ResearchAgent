import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface OnboardingHintProps {
  visible: boolean
  onDismiss: () => void
  children: React.ReactNode
  position?: 'above' | 'below'
}

export function OnboardingHint({ visible, onDismiss, children, position = 'below' }: OnboardingHintProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!visible || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'below' ? -4 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'below' ? -4 : 4 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className={`flex items-center gap-2 ${position === 'above' ? 'mb-2' : 'mt-2'}`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/8 border border-brand-500/15">
          <span className="text-[11px] text-brand-300/70 leading-snug">{children}</span>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded text-brand-300/30 hover:text-brand-300/60 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
