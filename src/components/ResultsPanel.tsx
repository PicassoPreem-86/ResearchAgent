import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  BriefcaseBusiness,
  AlertTriangle,
  Target,
  BarChart3,
  ShieldAlert,
  UserCircle,
  DollarSign,
} from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'
import { PainPointCard } from './PainPointCard'
import { SwotGrid } from './SwotGrid'
import { MarketPositionCard } from './MarketPositionCard'
import { RiskAssessmentCard } from './RiskAssessment'
import { KeyPeople } from './KeyPeople'
import { FinancialSignalsCard } from './FinancialSignals'
import { Toast } from './Toast'
import { ResultsHeader, ExecutiveSummary, CompetitiveLandscape, StrategicRecommendations, OutreachSection, SectionHeader, DataFreshnessBar, SectionConfidenceIndicator, SourcesSection, CompetitiveLandscapeMap, MarketRadar, ResearchTimeline } from './results'

interface ResultsPanelProps {
  report: ProspectReport
  onReset: () => void
  isWatching?: boolean
  onWatch?: (domain: string) => Promise<void>
  onUnwatch?: (domain: string) => Promise<void>
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

export function ResultsPanel({ report, onReset, isWatching, onWatch, onUnwatch }: ResultsPanelProps) {
  const { company, executiveSummary, painPoints, jobInsights, email, emails, swot, marketPosition, risks, keyPeople, financialSignals, competitiveLandscape, strategicRecommendations, template, dataFreshness, sectionConfidence } = report

  const confidenceBySection = (sectionConfidence || []).reduce<Record<string, typeof sectionConfidence[number]>>((acc, sc) => {
    acc[sc.section] = sc
    return acc
  }, {})
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
      <ResultsHeader
        company={company}
        template={template}
        report={report}
        onReset={onReset}
        isWatching={isWatching}
        onWatch={onWatch}
        onUnwatch={onUnwatch}
        isExporting={isExporting}
        onExportPdf={handleExportPdf}
        onToast={showToast}
      />

      {executiveSummary && <ExecutiveSummary summary={executiveSummary} />}

      {dataFreshness && dataFreshness.totalPagesSuccessful > 0 && (
        <DataFreshnessBar freshness={dataFreshness} />
      )}

      {hasMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <SectionHeader icon={Target} title="Market Position" accent="text-brand-400" />
            <SectionConfidenceIndicator confidence={confidenceBySection.marketPosition} />
          </div>
          <MarketPositionCard market={marketPosition} />
        </motion.div>
      )}

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

      {hasFinancials && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <SectionHeader icon={DollarSign} title="Financial Signals" accent="text-emerald-400" />
            <SectionConfidenceIndicator confidence={confidenceBySection.financialSignals} />
          </div>
          <FinancialSignalsCard signals={financialSignals} />
        </motion.div>
      )}

      {hasPeople && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <SectionHeader icon={UserCircle} title="Key People" accent="text-brand-400" />
            <SectionConfidenceIndicator confidence={confidenceBySection.keyPeople} />
          </div>
          <KeyPeople people={keyPeople} />
        </motion.div>
      )}

      {/* Two-column layout: Tech + Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

      {painPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <SectionHeader icon={AlertTriangle} title="Identified Pain Points" accent="text-amber-400" />
            <SectionConfidenceIndicator confidence={confidenceBySection.painPoints} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {painPoints.map((pp, i) => (
              <PainPointCard key={i} painPoint={pp} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {hasRisks && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <SectionHeader icon={ShieldAlert} title="Risk Assessment" accent="text-red-400" />
            <SectionConfidenceIndicator confidence={confidenceBySection.risks} />
          </div>
          <RiskAssessmentCard risks={risks} />
        </motion.div>
      )}

      {hasCompetitors && <CompetitiveLandscape landscape={competitiveLandscape} />}

      {hasCompetitors && (
        <CompetitiveLandscapeMap
          company={company}
          landscape={competitiveLandscape}
          marketPosition={marketPosition}
        />
      )}

      <MarketRadar report={report} />

      <ResearchTimeline
        domain={company.domain}
        reports={[{
          researchedAt: report.researchedAt,
          confidence: company.confidence,
          riskLevel: risks?.level,
          painPointCount: painPoints.length,
          jobCount: jobInsights.length,
        }]}
      />

      {hasRecommendations && <StrategicRecommendations recommendations={strategicRecommendations} />}

      {dataFreshness && dataFreshness.sources.length > 0 && (
        <SourcesSection freshness={dataFreshness} />
      )}

      {(isSalesTemplate || email) && (
        <OutreachSection
          email={email}
          emails={emails}
          recipientDomain={company.domain}
          onToast={showToast}
        />
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
