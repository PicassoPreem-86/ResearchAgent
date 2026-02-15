import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'

interface ToastProps {
  message: string
  variant?: 'success' | 'error'
  visible: boolean
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, variant = 'success', visible, onDismiss, duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [visible, onDismiss, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-xl"
          style={{
            background: variant === 'success'
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            borderColor: variant === 'success'
              ? 'rgba(16, 185, 129, 0.25)'
              : 'rgba(239, 68, 68, 0.25)',
          }}
        >
          {variant === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <X className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={`text-xs font-medium ${variant === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
