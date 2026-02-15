import { motion } from 'framer-motion'
import {
  Briefcase, DollarSign, Shield, ShieldAlert, Users, Zap,
  TrendingDown, Globe, Package, Code, BarChart3
} from 'lucide-react'
import type { Signal } from '@/hooks/useSignals'

const typeIcons: Record<string, typeof Briefcase> = {
  hiring_surge: Briefcase,
  hiring_slowdown: TrendingDown,
  new_funding: DollarSign,
  pricing_change: BarChart3,
  leadership_change: Users,
  product_launch: Package,
  tech_stack_change: Code,
  competitor_move: Globe,
  risk_escalation: ShieldAlert,
  risk_resolved: Shield,
  market_shift: Zap,
}

const severityStyles: Record<string, { dot: string; badge: string; badgeText: string }> = {
  info: {
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/10 border-blue-500/20',
    badgeText: 'text-blue-400',
  },
  notable: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 border-amber-500/20',
    badgeText: 'text-amber-400',
  },
  critical: {
    dot: 'bg-red-400',
    badge: 'bg-red-500/10 border-red-500/20',
    badgeText: 'text-red-400',
  },
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

interface SignalCardProps {
  signal: Signal
  onMarkRead: (id: string) => void
  onDomainClick?: (domain: string) => void
}

export function SignalCard({ signal, onMarkRead, onDomainClick }: SignalCardProps) {
  const Icon = typeIcons[signal.type] || Zap
  const styles = severityStyles[signal.severity] || severityStyles.info

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={() => !signal.read && onMarkRead(signal.id)}
      className={`group relative flex gap-3 px-3.5 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
        signal.read
          ? 'bg-transparent hover:bg-white/[0.02]'
          : 'bg-white/[0.03] hover:bg-white/[0.05]'
      }`}
    >
      {/* Unread dot */}
      {!signal.read && (
        <div className={`absolute top-3.5 left-1 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center ${styles.badge}`}>
        <Icon className={`w-3.5 h-3.5 ${styles.badgeText}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-xs font-medium leading-tight ${signal.read ? 'text-white/40' : 'text-white/80'}`}>
            {signal.title}
          </h4>
          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-medium ${styles.badge} ${styles.badgeText}`}>
            {signal.severity}
          </span>
        </div>
        <p className={`text-[11px] mt-0.5 leading-relaxed ${signal.read ? 'text-white/25' : 'text-white/45'}`}>
          {signal.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDomainClick?.(signal.domain)
            }}
            className="text-[10px] text-brand-400/60 hover:text-brand-400 transition-colors"
          >
            {signal.domain}
          </button>
          <span className="text-[10px] text-white/20">{timeAgo(signal.detectedAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}
