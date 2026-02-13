import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Download, Loader2, ChevronDown, Trophy, FileText, Swords, Crown, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { ComparisonReport } from '@/types/prospect'
import { ResultsPanel } from './ResultsPanel'

interface ComparisonResultsProps {
  report: ComparisonReport
  onReset: () => void
}

function ComparisonMatrix({ report }: { report: ComparisonReport }) {
  const { companies, comparison } = report
  const domains = companies.map((c) => c.company.domain)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 text-[10px] text-white/25 uppercase tracking-wider font-semibold border-b border-white/[0.06] min-w-[140px]">
              Dimension
            </th>
            {domains.map((domain) => {
              const company = companies.find((c) => c.company.domain === domain)
              return (
                <th key={domain} className="text-left p-3 text-xs text-white/60 font-semibold border-b border-white/[0.06] min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-brand-300">{(company?.company.name || domain)[0].toUpperCase()}</span>
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white/70 truncate">{company?.company.name || domain}</div>
                      <div className="text-[10px] text-white/25 font-normal">{domain}</div>
                    </div>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {comparison.dimensions.map((dim, di) => {
            const maxScore = Math.max(...dim.entries.map((e) => e.score ?? 0))
            return (
              <motion.tr
                key={dim.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: di * 0.05 }}
                className="group hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-3 border-b border-white/[0.04]">
                  <span className="text-xs font-medium text-white/50">{dim.name}</span>
                </td>
                {domains.map((domain) => {
                  const entry = dim.entries.find((e) => e.domain === domain)
                  const isWinner = dim.winner
                    ? domain === dim.winner
                    : (entry && entry.score != null && entry.score === maxScore && maxScore > 0)
                  return (
                    <td key={domain} className="p-3 border-b border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs leading-relaxed ${isWinner ? 'text-brand-300 font-medium' : 'text-white/40'}`}>
                          {entry?.value || '-'}
                        </span>
                        {entry?.score != null && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${isWinner ? 'bg-brand-400' : 'bg-white/20'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(entry.score / 10) * 100}%` }}
                                transition={{ duration: 0.5, delay: di * 0.05 }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono ${isWinner ? 'text-brand-300' : 'text-white/25'}`}>
                              {entry.score}
                            </span>
                          </div>
                        )}
                        {isWinner && (
                          <Trophy className="w-3 h-3 text-brand-400 shrink-0" />
                        )}
                      </div>
                    </td>
                  )
                })}
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ComparisonResults({ report, onReset }: ComparisonResultsProps) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/export/comparison-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'comparison-report.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // export may not be available
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto"
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
          Compare another set
        </button>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleExportPdf}
            disabled={isExporting}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.1] transition-all disabled:opacity-40"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export PDF</span>
          </motion.button>
          <div className="text-xs text-white/20 font-mono">
            {new Date(report.generatedAt).toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass glow p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
            <Swords className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white/90">Company Comparison</h2>
            <p className="text-xs text-white/30">{report.companies.length} companies analyzed</p>
          </div>
          {report.comparison.overallWinner && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-amber-300/50 uppercase tracking-wider font-semibold">Overall Winner</div>
                <div className="text-sm font-bold text-amber-300">
                  {report.companies.find(c => c.company.domain === report.comparison.overallWinner)?.company.name || report.comparison.overallWinner}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Comparison Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass p-6 mb-8"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-white/80">Comparison Matrix</h3>
        </div>
        <ComparisonMatrix report={report} />
      </motion.div>

      {/* Summary & Recommendation */}
      {(report.comparison.summary || report.comparison.recommendation) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {report.comparison.summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass p-6"
            >
              <h3 className="text-sm font-semibold text-white/70 mb-3">Summary</h3>
              <p className="text-sm text-white/45 leading-relaxed">{report.comparison.summary}</p>
            </motion.div>
          )}
          {report.comparison.recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="glass p-6 border-l-2 border-l-brand-500/40"
            >
              <h3 className="text-sm font-semibold text-brand-300/80 mb-3">Recommendation</h3>
              <p className="text-sm text-white/45 leading-relaxed">{report.comparison.recommendation}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Company Summaries (strengths/weaknesses) */}
      {report.comparison.companySummaries && report.comparison.companySummaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mb-8"
        >
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Strengths & Weaknesses</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.comparison.companySummaries.map((cs) => {
              const company = report.companies.find(c => c.company.domain === cs.domain)
              const isWinner = cs.domain === report.comparison.overallWinner
              return (
                <div key={cs.domain} className={`glass p-5 ${isWinner ? 'border-amber-500/20 border' : ''}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-brand-300">{(company?.company.name || cs.domain)[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white/70 truncate">{company?.company.name || cs.domain}</div>
                      <div className="text-[10px] text-white/25">{cs.domain}</div>
                    </div>
                    {isWinner && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                  {cs.strengths && cs.strengths.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsUp className="w-3 h-3 text-emerald-400/60" />
                        <span className="text-[10px] text-emerald-300/50 uppercase tracking-wider font-semibold">Strengths</span>
                      </div>
                      <div className="space-y-1">
                        {cs.strengths.map((s, i) => (
                          <p key={i} className="text-xs text-white/40 leading-relaxed pl-5">{s}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {cs.weaknesses && cs.weaknesses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsDown className="w-3 h-3 text-red-400/60" />
                        <span className="text-[10px] text-red-300/50 uppercase tracking-wider font-semibold">Weaknesses</span>
                      </div>
                      <div className="space-y-1">
                        {cs.weaknesses.map((w, i) => (
                          <p key={i} className="text-xs text-white/40 leading-relaxed pl-5">{w}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Individual company reports - expandable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Individual Reports</div>
        <div className="space-y-3">
          {report.companies.map((company) => (
            <div key={company.company.domain}>
              <button
                onClick={() => setExpandedCompany(expandedCompany === company.company.domain ? null : company.company.domain)}
                className="w-full text-left glass glass-hover p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-300">{company.company.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white/80">{company.company.name}</div>
                    <div className="text-xs text-white/30">{company.company.domain} - {company.company.industry}</div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedCompany === company.company.domain ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/20" />
                  </motion.div>
                </div>
              </button>
              <AnimatePresence>
                {expandedCompany === company.company.domain && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pb-2">
                      <ResultsPanel report={company} onReset={() => setExpandedCompany(null)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
