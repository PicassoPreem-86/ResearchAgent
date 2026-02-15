import { motion } from 'framer-motion'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ErrorStateProps {
  title: string
  error?: string | null
  onRetry: () => void
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[calc(100vh-10rem)]"
    >
      <div className="text-center max-w-md">
        <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white/90 mb-2">{title}</h2>
        <p className="text-sm text-white/40 mb-6">{error || 'Something went wrong. Please try again.'}</p>
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </motion.button>
      </div>
    </motion.div>
  )
}
