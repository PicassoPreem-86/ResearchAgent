import { Brain, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeaderProps {
  onToggleHistory?: () => void
  historyCount?: number
}

export function Header({ onToggleHistory, historyCount }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 rounded-full" />
            <Brain className="relative w-7 h-7 text-brand-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white/90">
            Research<span className="gradient-text">Agent</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {onToggleHistory && (
            <motion.button
              onClick={onToggleHistory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07] transition-all duration-200"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">History</span>
              {historyCount !== undefined && historyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white leading-none min-w-[18px] min-h-[18px]">
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </motion.button>
          )}
          <div className="text-xs text-white/30 font-medium tracking-wide uppercase">
            AI Business Intelligence
          </div>
        </div>
      </div>
    </motion.header>
  )
}
