import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Globe,
  Users,
  Cpu,
  Newspaper,
  Package,
  BriefcaseBusiness,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Shield,
  Target,
  BarChart3,
  ShieldAlert,
  UserCircle,
  DollarSign,
  Lightbulb,
  Swords,
  FileText,
} from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'
import { EmailPreview } from './EmailPreview'
import { PainPointCard } from './PainPointCard'
import { SwotGrid } from './SwotGrid'
import { MarketPositionCard } from './MarketPositionCard'
import { RiskAssessmentCard } from './RiskAssessment'
import { KeyPeople } from './KeyPeople'
import { FinancialSignalsCard } from './FinancialSignals'
import { ExportMenu } from './ExportMenu'
import { WatchButton } from './WatchButton'
import { Toast } from './Toast'

interface ResultsPanelProps {
  report: ProspectReport
  onReset: () => void
  isWatching?: boolean
  onWatch?: (domain: string) => Promise<void>
  onUnwatch?: (domain: string) => Promise<void>
}

function SectionHeader({ icon: Icon, title, accent }: { icon: React.ElementType; title: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        <Icon className={`w-4 h-4 ${accent || 'text-white/40'}`} />
      </div>
      <h3 className="text-base font-semibold text-white/80">{title}</h3>
    </div>
  )
}

function TechBadge({ tech }: { tech: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition-all duration-200 cursor-default"
    >
      <Cpu className="w-3 h-3 text-brand-400/60" />
      {tech}
    </motion.span>
  )
}

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

export function ResultsPanel({ report, onReset, isWatching, onWatch, onUnwatch }: ResultsPanelProps) {
  const { company, executiveSummary, painPoints, jobInsights, email, emails, swot, marketPosition, risks, keyPeople, financialSignals, competitiveLandscape, strategicRecommendations, template } = report
  const [isExporting, setIsExporting] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const hasSwot = swot && (swot.strengths.length > 0 || swot.weaknesses.length > 0 || swot.opportunities.length > 0 || swot.threats.length > 0)
  const hasMarket = marketPosition && marketPosition.segment
  const hasRisks = risks && risks.flags && risks.flags.length > 0
  const hasPeople = keyPeople && keyPeople.length > 0
  const hasFinancials = financialSignals && (financialSignals.fundingStage || financialSignals.estimatedRevenue)
  const hasCompetitors = competitiveLandscape && competitiveLandscape.competitors && competitiveLandscape.competitors.length > 0
  const hasRecommendations = strategicRecommendations && strategicRecommendations.length > 0
  const isSalesTemplate = template === 'sales-research'

  const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant })
  }, [])

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${company.domain}-research.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('PDF downloaded')
    } catch {
      showToast('PDF export failed', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
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
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            onToast={showToast}
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

          {/* Confidence badge */}
          {company.confidence != null && (
            <ConfidenceBadge confidence={company.confidence} />
          )}
        </div>

        <p className="text-sm text-white/45 leading-relaxed mb-6">{company.description}</p>

        {/* Key Products */}
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

        {/* Recent News */}
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

      {/* Executive Summary */}
      {executiveSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.03 }}
          className="mb-8"
        >
          <SectionHeader icon={FileText} title="Executive Summary" accent="text-brand-400" />
          <div className="glass p-6 border-l-2 border-l-brand-500/40">
            <p className="text-sm text-white/55 leading-relaxed">{executiveSummary}</p>
          </div>
        </motion.div>
      )}

      {/* Market Position */}
      {hasMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <SectionHeader icon={Target} title="Market Position" accent="text-brand-400" />
          <MarketPositionCard market={marketPosition} />
        </motion.div>
      )}

      {/* SWOT Grid */}
      {hasSwot && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <SectionHeader icon={BarChart3} title="SWOT Analysis" accent="text-cyan-400" />
          <SwotGrid swot={swot} />
        </motion.div>
      )}

      {/* Financial Signals */}
      {hasFinancials && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8"
        >
          <SectionHeader icon={DollarSign} title="Financial Signals" accent="text-emerald-400" />
          <FinancialSignalsCard signals={financialSignals} />
        </motion.div>
      )}

      {/* Key People */}
      {hasPeople && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <SectionHeader icon={UserCircle} title="Key People" accent="text-brand-400" />
          <KeyPeople people={keyPeople} />
        </motion.div>
      )}

      {/* Two-column layout: Tech + Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Tech Stack */}
        {company.techStack.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <SectionHeader icon={Cpu} title="Tech Stack" accent="text-brand-400" />
            <div className="flex flex-wrap gap-2">
              {company.techStack.map((tech, i) => (
                <TechBadge key={i} tech={tech} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Job Insights */}
        {jobInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <SectionHeader icon={BriefcaseBusiness} title="Hiring Signals" accent="text-cyan-400" />
            <div className="space-y-3">
              {jobInsights.map((job, i) => (
                <div key={i} className="glass p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white/70">{job.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300/60 border border-cyan-500/15 font-medium">
                      {job.department}
                    </span>
                  </div>
                  <p className="text-xs text-white/35 leading-relaxed">{job.inference}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Pain Points */}
      {painPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-8"
        >
          <SectionHeader icon={AlertTriangle} title="Identified Pain Points" accent="text-amber-400" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {painPoints.map((pp, i) => (
              <PainPointCard key={i} painPoint={pp} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Risk Assessment */}
      {hasRisks && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <SectionHeader icon={ShieldAlert} title="Risk Assessment" accent="text-red-400" />
          <RiskAssessmentCard risks={risks} />
        </motion.div>
      )}

      {/* Competitive Landscape */}
      {hasCompetitors && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          className="mb-8"
        >
          <SectionHeader icon={Swords} title="Competitive Landscape" accent="text-blue-400" />
          <div className="glass p-6">
            {competitiveLandscape.moat && (
              <div className="mb-5">
                <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Competitive Moat</div>
                <p className="text-sm text-white/50 leading-relaxed">{competitiveLandscape.moat}</p>
              </div>
            )}
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Known Competitors</div>
            <div className="space-y-2 mb-5">
              {competitiveLandscape.competitors.map((comp, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-300">{comp.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white/70">{comp.name}</span>
                      {comp.domain && (
                        <span className="text-[10px] text-white/25">{comp.domain}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed">{comp.positioning}</p>
                  </div>
                </div>
              ))}
            </div>
            {competitiveLandscape.vulnerabilities && competitiveLandscape.vulnerabilities.length > 0 && (
              <div>
                <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Competitive Vulnerabilities</div>
                <div className="space-y-1.5">
                  {competitiveLandscape.vulnerabilities.map((vuln, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-400/40 mt-0.5 shrink-0" />
                      <span className="text-xs text-white/40 leading-relaxed">{vuln}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Strategic Recommendations */}
      {hasRecommendations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.44 }}
          className="mb-8"
        >
          <SectionHeader icon={Lightbulb} title="Strategic Recommendations" accent="text-amber-400" />
          <div className="space-y-3">
            {strategicRecommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.44 + i * 0.05 }}
                className="glass p-4 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-amber-300">{i + 1}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">{rec}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Email — always show for sales template, conditionally for others */}
      {(isSalesTemplate || email) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-brand-500/15 to-brand-600/10 border border-brand-500/20">
              <Sparkles className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/80">Personalized Outreach</h3>
              <p className="text-xs text-white/30">AI-crafted based on research findings</p>
            </div>
          </div>
          <EmailPreview email={email} emails={emails} recipientDomain={company.domain} onToast={showToast} />
        </motion.div>
      )}

      <Toast
        message={toast?.message || ''}
        variant={toast?.variant}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </motion.div>
  )
}
