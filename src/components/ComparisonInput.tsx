import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Globe, Plus, X, ArrowRight, TrendingUp, Swords, Handshake, Mail } from 'lucide-react'
import type { ReportTemplate } from '@/types/prospect'

interface TemplateOption {
  value: ReportTemplate
  label: string
  description: string
  icon: React.ElementType
}

const TEMPLATES: TemplateOption[] = [
  { value: 'general', label: 'General', description: 'Balanced overview', icon: Search },
  { value: 'investor-dd', label: 'Investor DD', description: 'Due diligence', icon: TrendingUp },
  { value: 'competitive-analysis', label: 'Competitive', description: 'Market positioning', icon: Swords },
  { value: 'partnership-eval', label: 'Partnership', description: 'Fit & synergy', icon: Handshake },
  { value: 'sales-research', label: 'Sales', description: 'Pain points', icon: Mail },
]

interface ComparisonInputProps {
  onCompare: (domains: string[], template?: ReportTemplate) => void
  isLoading: boolean
}

export function ComparisonInput({ onCompare, isLoading }: ComparisonInputProps) {
  const [domains, setDomains] = useState<string[]>(['', ''])
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('general')

  const updateDomain = (index: number, value: string) => {
    const next = [...domains]
    next[index] = value
    setDomains(next)
  }

  const addDomain = () => {
    if (domains.length < 5) {
      setDomains([...domains, ''])
    }
  }

  const removeDomain = (index: number) => {
    if (domains.length > 2) {
      setDomains(domains.filter((_, i) => i !== index))
    }
  }

  const validDomains = domains.filter((d) => d.trim().length > 0 && d.includes('.'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validDomains.length < 2 || isLoading) return
    onCompare(validDomains, selectedTemplate)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs font-medium text-brand-300 tracking-wide">Side-by-Side Comparison</span>
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          <span className="text-white/95">Compare companies</span>
          <br />
          <span className="gradient-text">head to head</span>
        </h1>
        <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
          Research and compare 2-5 companies across all dimensions. Find the best fit.
        </p>
      </div>

      {/* Template selector */}
      <div className="mb-6">
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3 text-center">Research Lens</div>
        <div className="grid grid-cols-5 gap-2">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon
            const isSelected = selectedTemplate === tmpl.value
            return (
              <motion.button
                key={tmpl.value}
                type="button"
                onClick={() => setSelectedTemplate(tmpl.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500/30'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-400' : 'text-white/30'}`} />
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-brand-300' : 'text-white/40'}`}>
                  {tmpl.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Domain inputs */}
        <div className="space-y-3 mb-4">
          <AnimatePresence>
            {domains.map((domain, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="glass p-2 flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 pl-3">
                    <Globe className="w-4 h-4 text-white/25 shrink-0" />
                    <span className="text-xs text-white/20 font-mono shrink-0 w-4">{i + 1}.</span>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => updateDomain(i, e.target.value)}
                      placeholder={i === 0 ? 'stripe.com' : i === 1 ? 'square.com' : 'company.com'}
                      className="flex-1 bg-transparent text-white placeholder:text-white/15 text-sm font-medium outline-none py-2.5"
                      disabled={isLoading}
                    />
                  </div>
                  {domains.length > 2 && (
                    <motion.button
                      type="button"
                      onClick={() => removeDomain(i)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add + Compare buttons */}
        <div className="flex items-center justify-between">
          {domains.length < 5 ? (
            <motion.button
              type="button"
              onClick={addDomain}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add company
              <span className="text-white/20 ml-1">({domains.length}/5)</span>
            </motion.button>
          ) : (
            <span className="text-xs text-white/20">Max 5 companies</span>
          )}

          <motion.button
            type="submit"
            disabled={validDomains.length < 2 || isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-brand-500/40"
          >
            <Swords className="w-4 h-4" />
            <span>Compare {validDomains.length > 0 ? `(${validDomains.length})` : ''}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}
