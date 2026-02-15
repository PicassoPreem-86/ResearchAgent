import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, RefreshCw, Radio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SignalCard } from '@/components/SignalCard'
import type { Signal } from '@/hooks/useSignals'

interface SignalsFeedProps {
  signals: Signal[]
  unreadCount: number
  isLoading: boolean
  onMarkRead: (id: string) => void
  onDismissAll: () => void
  onRefresh: () => void
  onDomainClick?: (domain: string) => void
}

export function SignalsFeed({
  signals,
  unreadCount,
  isLoading,
  onMarkRead,
  onDismissAll,
  onRefresh,
  onDomainClick,
}: SignalsFeedProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Group signals by domain
  const grouped = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    ;(acc[s.domain] ??= []).push(s)
    return acc
  }, {})

  const sortedDomains = Object.keys(grouped).sort((a, b) => {
    const aLatest = Math.max(...grouped[a].map(s => new Date(s.detectedAt).getTime()))
    const bLatest = Math.max(...grouped[b].map(s => new Date(s.detectedAt).getTime()))
    return bLatest - aLatest
  })

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07] transition-all duration-200"
      >
        <Bell className="w-3.5 h-3.5" />
        <span className="text-xs font-medium hidden sm:inline">Signals</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none min-w-[16px] min-h-[16px] px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-brand-400" />
                <h3 className="text-sm font-semibold text-white/80">Signals</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all disabled:opacity-30"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={onDismissAll}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Signal list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {signals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-white/15" />
                  </div>
                  <p className="text-xs text-white/30 font-medium">No signals yet</p>
                  <p className="text-[11px] text-white/15 mt-1">Watch some companies to get started.</p>
                </div>
              ) : (
                <div className="py-1">
                  {sortedDomains.map(domain => (
                    <div key={domain}>
                      <div className="px-4 pt-2.5 pb-1">
                        <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">
                          {domain}
                        </span>
                      </div>
                      {grouped[domain].map(signal => (
                        <SignalCard
                          key={signal.id}
                          signal={signal}
                          onMarkRead={onMarkRead}
                          onDomainClick={(d) => {
                            setOpen(false)
                            onDomainClick?.(d)
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
