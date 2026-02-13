import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Globe,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  ExternalLink,
  Crosshair,
  Building2,
  Package,
  Sparkles,
} from 'lucide-react'
import type { DiscoverResults as DiscoverResultsType, DiscoveredCompany } from '@/types/prospect'

interface DiscoverResultsProps {
  results: DiscoverResultsType
  onReset: () => void
  onResearchDomain: (domain: string) => void
}

type SortField = 'matchScore' | 'name' | 'source'

function MatchScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : score >= 70
      ? 'text-brand-400 bg-brand-500/10 border-brand-500/20'
      : 'text-white/40 bg-white/[0.04] border-white/[0.06]'
  const barColor =
    score >= 90 ? 'bg-emerald-400' : score >= 70 ? 'bg-brand-400' : 'bg-white/20'

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${color}`}>
      <div className="w-10 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums">{score}</span>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    google: 'bg-blue-500/10 text-blue-300/70 border-blue-500/15',
    producthunt: 'bg-orange-500/10 text-orange-300/70 border-orange-500/15',
    yc: 'bg-amber-500/10 text-amber-300/70 border-amber-500/15',
  }
  const label =
    source.toLowerCase() === 'producthunt'
      ? 'Product Hunt'
      : source.toLowerCase() === 'yc'
      ? 'YC'
      : source.charAt(0).toUpperCase() + source.slice(1)
  const colorClass = colors[source.toLowerCase()] || 'bg-white/[0.04] text-white/30 border-white/[0.06]'

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
      {label}
    </span>
  )
}

function CompanyCard({
  company,
  index,
  onResearch,
}: {
  company: DiscoveredCompany
  index: number
  onResearch: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="glass glass-hover p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Company icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/10 border border-brand-500/15 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand-300">
            {company.name ? company.name[0].toUpperCase() : '?'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white/85 truncate">{company.name}</h3>
            <SourceBadge source={company.source} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/30 mb-2">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              <span className="truncate">{company.domain}</span>
            </span>
            {company.industry && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {company.industry}
              </span>
            )}
            {company.estimatedSize && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/25">
                {company.estimatedSize}
              </span>
            )}
          </div>

          {/* Description or snippet */}
          <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-2">
            {company.description || company.snippet}
          </p>

          {/* Why relevant - AI insight */}
          {company.whyRelevant && (
            <div className="flex items-start gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-brand-400/50 mt-0.5 shrink-0" />
              <p className="text-[11px] text-brand-300/50 leading-relaxed italic">{company.whyRelevant}</p>
            </div>
          )}

          {/* Key Products */}
          {company.keyProducts && company.keyProducts.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {company.keyProducts.slice(0, 4).map((product, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/8 border border-brand-500/12 text-brand-300/40 flex items-center gap-1"
                >
                  <Package className="w-2.5 h-2.5" />
                  {product}
                </span>
              ))}
            </div>
          )}

          {/* Match reasons */}
          {company.matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {company.matchReasons.map((reason, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/35"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score + Research button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <MatchScoreBadge score={company.matchScore} />
          <motion.button
            onClick={onResearch}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs font-medium text-brand-300 hover:bg-brand-500/20 hover:border-brand-500/30 transition-all opacity-0 group-hover:opacity-100"
          >
            <Search className="w-3 h-3" />
            Research
            <ExternalLink className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export function DiscoverResults({ results, onReset, onResearchDomain }: DiscoverResultsProps) {
  const [sortBy, setSortBy] = useState<SortField>('matchScore')
  const [minScore, setMinScore] = useState(0)

  const filteredAndSorted = useMemo(() => {
    let companies = results.companies.filter((c) => c.matchScore >= minScore)

    companies.sort((a, b) => {
      switch (sortBy) {
        case 'matchScore':
          return b.matchScore - a.matchScore
        case 'name':
          return a.name.localeCompare(b.name)
        case 'source':
          return a.source.localeCompare(b.source)
        default:
          return 0
      }
    })

    return companies
  }, [results.companies, sortBy, minScore])

  const queryLabel = results.referenceDomain
    ? `Companies similar to ${results.referenceDomain}`
    : results.icp
    ? `${results.icp.industries.join(', ')}${results.icp.keywords.length > 0 ? ' - ' + results.icp.keywords.join(', ') : ''}`
    : results.query

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
          Search again
        </button>
        <div className="text-xs text-white/20 font-mono">
          {new Date(results.generatedAt).toLocaleString()}
        </div>
      </motion.div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass glow p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 shrink-0">
            <Crosshair className="w-6 h-6 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white/90 mb-1">Discovery Results</h2>
            <p className="text-sm text-white/40 truncate">{queryLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
              <span className="text-sm font-bold text-brand-300">{results.companies.length}</span>
              <span className="text-xs text-brand-300/50 ml-1">found</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters + Sort */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 mb-6"
      >
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Sort</span>
          <div className="flex items-center gap-1">
            {([
              { value: 'matchScore', label: 'Score' },
              { value: 'name', label: 'Name' },
              { value: 'source', label: 'Source' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sortBy === opt.value
                    ? 'bg-white/[0.08] text-white/70'
                    : 'text-white/25 hover:text-white/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min score filter */}
        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Min Score</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-20 h-1 appearance-none bg-white/[0.06] rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-400 [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-[11px] font-mono text-white/30 w-6 text-right">{minScore}</span>
        </div>
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/20">
          Showing {filteredAndSorted.length} of {results.companies.length} companies
        </span>
      </div>

      {/* Company cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAndSorted.map((company, i) => (
            <CompanyCard
              key={company.domain}
              company={company}
              index={i}
              onResearch={() => onResearchDomain(company.domain)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredAndSorted.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
            <Search className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm text-white/30">
            No companies match the current filter. Try lowering the minimum score.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
