import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  ChevronDown,
  Globe,
  Package,
  Mail,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import type { DomainResult } from '@/hooks/useBulkResearch'
import { ResultsPanel } from './ResultsPanel'

interface BulkResultsProps {
  domainResults: DomainResult[]
  onExportCsv: () => void
  onReset: () => void
}

function CopyAllButton({ domainResults }: { domainResults: DomainResult[] }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const emails = domainResults
      .filter((dr) => dr.status === 'complete' && dr.report)
      .map((dr) => {
        const r = dr.report!
        return `--- ${r.company.name} (${r.company.domain}) ---\nSubject: ${r.email.subject}\n\n${r.email.body}\n`
      })
      .join('\n\n')

    navigator.clipboard.writeText(emails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.1] transition-all"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy All Emails</span>
        </>
      )}
    </motion.button>
  )
}

function ResultRow({ result, index }: { result: DomainResult; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const isSuccess = result.status === 'complete' && result.report
  const report = result.report

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <button
        onClick={() => isSuccess && setExpanded(!expanded)}
        className={`w-full text-left glass glass-hover p-4 ${isSuccess ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
      >
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSuccess ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {isSuccess ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
          </div>

          {/* Company info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white/80 truncate">
                {isSuccess && report ? report.company.name : result.domain}
              </span>
              {isSuccess && report && (
                <span className="text-xs text-white/25 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {report.company.domain}
                </span>
              )}
            </div>
            {isSuccess && report ? (
              <div className="flex items-center gap-3 text-xs text-white/35">
                {report.company.industry && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {report.company.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {report.email.subject.slice(0, 50)}{report.email.subject.length > 50 ? '...' : ''}
                </span>
              </div>
            ) : (
              <span className="text-xs text-red-400/50">{result.error || 'Research failed'}</span>
            )}
          </div>

          {/* Expand arrow */}
          {isSuccess && (
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-white/20" />
            </motion.div>
          )}
        </div>
      </button>

      {/* Expanded report */}
      <AnimatePresence>
        {expanded && isSuccess && report && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2">
              <ResultsPanel report={report} onReset={() => setExpanded(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function BulkResults({ domainResults, onExportCsv, onReset }: BulkResultsProps) {
  const successCount = domainResults.filter((d) => d.status === 'complete').length
  const errorCount = domainResults.filter((d) => d.status === 'error').length

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
        className="flex items-center justify-between mb-6"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          New research
        </button>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass glow p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white/90 mb-1">Bulk Research Complete</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-400/70">{successCount} succeeded</span>
              {errorCount > 0 && <span className="text-red-400/70">{errorCount} failed</span>}
              <span className="text-white/30">{domainResults.length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyAllButton domainResults={domainResults} />
            <motion.button
              onClick={onExportCsv}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-brand-500/40"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Results list */}
      <div className="space-y-3">
        {domainResults.map((dr, i) => (
          <ResultRow key={dr.domain} result={dr} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
