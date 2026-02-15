import { useState, useRef, useEffect } from 'react'
import { Brain, Clock, LogOut, User, ChevronDown, Eye } from 'lucide-react'
import { SignalsFeed } from '@/components/SignalsFeed'
import type { Signal } from '@/hooks/useSignals'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { UsageBadge } from '@/components/UsageBadge'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UsageStats {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

interface Quotas {
  researches: number
  comparisons: number
  discovers: number
  talents: number
}

interface HeaderProps {
  onToggleHistory?: () => void
  historyCount?: number
  user?: SupabaseUser | null
  isAuthEnabled?: boolean
  onSignInClick?: () => void
  onSignOut?: () => void
  usage?: UsageStats
  quotas?: Quotas
  usageLabel?: string
  watchCount?: number
  onToggleWatchList?: () => void
  signals?: Signal[]
  signalUnreadCount?: number
  signalsLoading?: boolean
  onSignalMarkRead?: (id: string) => void
  onSignalDismissAll?: () => void
  onSignalRefresh?: () => void
  onSignalDomainClick?: (domain: string) => void
}

function getInitials(user: SupabaseUser): string {
  const meta = user.user_metadata
  if (meta?.full_name) {
    return meta.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  return 'U'
}

function getDisplayName(user: SupabaseUser): string {
  const meta = user.user_metadata
  if (meta?.full_name) return meta.full_name
  if (user.email) return user.email
  return 'User'
}

function UserMenu({ user, onSignOut }: { user: SupabaseUser; onSignOut: () => void }) {
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

  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-brand-300">{getInitials(user)}</span>
          </div>
        )}
        <span className="text-xs font-medium text-white/50 max-w-[120px] truncate hidden sm:block">
          {getDisplayName(user)}
        </span>
        <ChevronDown className={`w-3 h-3 text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-300">{getInitials(user)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{getDisplayName(user)}</p>
                  {user.email && (
                    <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header({
  onToggleHistory,
  historyCount,
  user,
  isAuthEnabled,
  onSignInClick,
  onSignOut,
  usage,
  quotas,
  usageLabel,
  watchCount,
  onToggleWatchList,
  signals,
  signalUnreadCount,
  signalsLoading,
  onSignalMarkRead,
  onSignalDismissAll,
  onSignalRefresh,
  onSignalDomainClick,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 rounded-full" />
            <Brain className="relative w-7 h-7 text-brand-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white/90">
            Research<span className="gradient-text">Agent</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Usage badge */}
          {usage && quotas && usageLabel && (
            <div className="hidden sm:block">
              <UsageBadge usage={usage} quotas={quotas} label={usageLabel} />
            </div>
          )}

          {/* Signals feed */}
          {signals && onSignalMarkRead && onSignalDismissAll && onSignalRefresh && (
            <SignalsFeed
              signals={signals}
              unreadCount={signalUnreadCount ?? 0}
              isLoading={signalsLoading ?? false}
              onMarkRead={onSignalMarkRead}
              onDismissAll={onSignalDismissAll}
              onRefresh={onSignalRefresh}
              onDomainClick={onSignalDomainClick}
            />
          )}

          {/* Watch list button */}
          {onToggleWatchList && (
            <motion.button
              onClick={onToggleWatchList}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07] transition-all duration-200"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Watch</span>
              {watchCount !== undefined && watchCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white leading-none min-w-[16px] min-h-[16px] px-1">
                  {watchCount}
                </span>
              )}
            </motion.button>
          )}

          {/* History button */}
          {onToggleHistory && (
            <motion.button
              onClick={onToggleHistory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.07] transition-all duration-200"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">History</span>
              {historyCount !== undefined && historyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white leading-none min-w-[16px] min-h-[16px] px-1">
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </motion.button>
          )}

          {/* Auth section */}
          {isAuthEnabled && user ? (
            <UserMenu user={user} onSignOut={onSignOut!} />
          ) : isAuthEnabled && onSignInClick ? (
            <motion.button
              onClick={onSignInClick}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-medium text-brand-300 hover:bg-brand-500/15 hover:text-brand-200 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </motion.button>
          ) : (
            <div className="text-xs text-white/30 font-medium tracking-wide uppercase hidden sm:block">
              AI Business Intelligence
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
