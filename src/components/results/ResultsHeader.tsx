import { motion } from 'framer-motion'
import { Building2, Globe, Users, Package, Newspaper, Shield, ArrowLeft } from 'lucide-react'
import type { CompanyBrief, ReportTemplate, ProspectReport } from '@/types/prospect'
import { ExportMenu } from '../ExportMenu'
import { WatchButton } from '../WatchButton'

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const normalized = Math.max(0, Math.min(100, Math.round(confidence)))
  const color =
    normalized >= 80 ? 'text-emerald-400' :
    normalized >= 50 ? 'text-amber-400' :
    'text-red-400'
  const bgColor =
    normalized >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' :
    normalized >= 50 ? 'bg-amber-500/10 border-amber-500/20' :
    'bg-red-500/10 border-red-500/20'
  const trackColor =
    normalized >= 80 ? 'stroke-emerald-500/20' :
    normalized >= 50 ? 'stroke-amber-500/20' :
    'stroke-red-500/20'
  const fillColor =
    normalized >= 80 ? 'stroke-emerald-400' :
    normalized >= 50 ? 'stroke-amber-400' :
    'stroke-red-400'

  const circumference = 2 * Math.PI * 16
  const offset = circumference - (normalized / 100) * circumference

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${bgColor}`}>
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2.5" className={trackColor} />
          <motion.circle
            cx="18" cy="18" r="16" fill="none" strokeWidth="2.5"
            strokeLinecap="round"
            className={fillColor}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-bold ${color}`}>{normalized}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3 h-3 ${color}`} />
          <span className={`text-xs font-semibold ${color}`}>Confidence</span>
        </div>
        <span className="text-[10px] text-white/25">Research quality score</span>
      </div>
    </div>
  )
}

interface ResultsHeaderProps {
  company: CompanyBrief
  template?: ReportTemplate
  report: ProspectReport
  onReset: () => void
  isWatching?: boolean
  onWatch?: (domain: string) => Promise<void>
  onUnwatch?: (domain: string) => Promise<void>
  isExporting: boolean
  onExportPdf: () => void
  onToast: (message: string, variant?: 'success' | 'error') => void
}

export function ResultsHeader({
  company,
  template,
  report,
  onReset,
  isWatching,
  onWatch,
  onUnwatch,
  isExporting,
  onExportPdf,
  onToast,
}: ResultsHeaderProps) {
  return (
    <>
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Research another
        </button>
        <div className="flex items-center gap-2">
          {onWatch && onUnwatch && (
            <WatchButton
              domain={company.domain}
              isWatching={isWatching ?? false}
              onWatch={async (d) => onWatch(d)}
              onUnwatch={async (d) => onUnwatch(d)}
            />
          )}
          <ExportMenu
            report={report}
            onExportPdf={onExportPdf}
            isExporting={isExporting}
            onToast={onToast}
          />
          <div className="text-xs text-white/20 font-mono hidden sm:block">
            {new Date(report.researchedAt).toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* Company hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass glow p-8 mb-8"
      >
        <div className="flex items-start gap-5 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white/95 mb-1">{company.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {company.domain}
              </span>
              {company.industry && (
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  {company.industry}
                </span>
              )}
              {company.estimatedSize && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {company.estimatedSize}
                </span>
              )}
              {template && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300/60 font-semibold uppercase tracking-wider">
                  {template.replace(/-/g, ' ')}
                </span>
              )}
            </div>
          </div>

          {company.confidence != null && (
            <ConfidenceBadge confidence={company.confidence} />
          )}
        </div>

        <p className="text-sm text-white/45 leading-relaxed mb-6">{company.description}</p>

        {company.keyProducts.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Key Products</div>
            <div className="flex flex-wrap gap-2">
              {company.keyProducts.map((product, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40"
                >
                  {product}
                </span>
              ))}
            </div>
          </div>
        )}

        {company.recentNews.length > 0 && (
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Recent Signals</div>
            <div className="space-y-1.5">
              {company.recentNews.map((news, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Newspaper className="w-3 h-3 text-white/15 mt-0.5 shrink-0" />
                  <span className="text-xs text-white/35 leading-relaxed">{news}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
