import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface WatchButtonProps {
  domain: string
  isWatching: boolean
  onWatch: (domain: string) => Promise<void>
  onUnwatch: (domain: string) => Promise<void>
}

export function WatchButton({ domain, isWatching, onWatch, onUnwatch }: WatchButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      if (isWatching) {
        await onUnwatch(domain)
      } else {
        await onWatch(domain)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isWatching
          ? 'bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300'
          : 'bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07]'
      }`}
      title={isWatching ? 'Stop watching' : 'Watch for changes'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isWatching ? (
        <EyeOff className="w-3.5 h-3.5" />
      ) : (
        <Eye className="w-3.5 h-3.5" />
      )}
      <span>{isWatching ? 'Watching' : 'Watch'}</span>
    </motion.button>
  )
}
