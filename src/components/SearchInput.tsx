import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, User, Building2, Briefcase, ArrowRight, Globe, Package, FileText, TrendingUp, Swords, Handshake, Mail, Eye } from 'lucide-react'
import { OnboardingHint } from '@/components/OnboardingHint'
import { useOnboarding } from '@/hooks/useOnboarding'
import type { EmailTone, SellerContext, ReportTemplate } from '@/types/prospect'

const EXAMPLE_DOMAINS = [
  'stripe.com',
  'notion.so',
  'linear.app',
  'vercel.com',
  'figma.com',
  'datadog.com',
  'airtable.com',
]

const TONE_OPTIONS: { value: EmailTone; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'provocative', label: 'Provocative' },
  { value: 'consultative', label: 'Consultative' },
]

interface TemplateOption {
  value: ReportTemplate
  label: string
  description: string
  icon: React.ElementType
}

const TEMPLATES: TemplateOption[] = [
  { value: 'general', label: 'General Research', description: 'Balanced overview', icon: Search },
  { value: 'investor-dd', label: 'Investor DD', description: 'Due diligence brief', icon: TrendingUp },
  { value: 'competitive-analysis', label: 'Competitive Analysis', description: 'Market positioning', icon: Swords },
  { value: 'partnership-eval', label: 'Partnership Eval', description: 'Fit & synergy analysis', icon: Handshake },
  { value: 'sales-research', label: 'Sales Research', description: 'Pain points & outreach', icon: Mail },
]

interface SearchInputProps {
  onSearch: (
    domain: string,
    senderContext?: { senderName?: string; senderCompany?: string; senderRole?: string },
    tone?: EmailTone,
    sellerContext?: SellerContext,
    template?: ReportTemplate,
  ) => void
  isLoading: boolean
  onLoadExample?: () => void
}

export function SearchInput({ onSearch, isLoading, onLoadExample }: SearchInputProps) {
  const [domain, setDomain] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderCompany, setSenderCompany] = useState('')
  const [senderRole, setSenderRole] = useState('')
  const [selectedTone, setSelectedTone] = useState<EmailTone>('casual')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('general')
  const [product, setProduct] = useState('')
  const [valueProposition, setValueProposition] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { hasSeenLensHint, hasSeenToneHint, hasSeenContextHint, dismissLensHint, dismissToneHint, dismissContextHint } = useOnboarding()

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % EXAMPLE_DOMAINS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain.trim() || isLoading) return
    const ctx = showContext
      ? { senderName: senderName || undefined, senderCompany: senderCompany || undefined, senderRole: senderRole || undefined }
      : undefined
    const seller: SellerContext | undefined =
      product || valueProposition ? { product: product || undefined, valueProposition: valueProposition || undefined } : undefined
    onSearch(domain.trim(), ctx, selectedTone, seller, selectedTemplate)
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
          <span className="text-xs font-medium text-brand-300 tracking-wide">AI-Powered Intelligence</span>
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          <span className="text-white/95">Research any business</span>
          <br />
          <span className="gradient-text">in seconds</span>
        </h1>
        <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
          AI-powered company intelligence. Pick a lens, enter a domain, get a deep research report.
        </p>
        {onLoadExample && (
          <motion.button
            type="button"
            onClick={onLoadExample}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-brand-400/60 hover:text-brand-400 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            See an example report
          </motion.button>
        )}
      </div>

      {/* Template selector */}
      <div className="mb-6">
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3 text-center">Research Lens</div>
        <OnboardingHint visible={!hasSeenLensHint} onDismiss={dismissLensHint} position="above">
          Choose what angle matters most — this shapes the entire report
        </OnboardingHint>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                className={`relative flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-3 sm:py-3.5 rounded-xl border text-center transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500/30 shadow-lg shadow-brand-500/10'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors duration-200 ${
                  isSelected ? 'bg-brand-500/20' : 'bg-white/[0.04]'
                }`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-400' : 'text-white/30'}`} />
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold transition-colors duration-200 truncate w-full ${
                  isSelected ? 'text-brand-300' : 'text-white/50'
                }`}>
                  {tmpl.label}
                </span>
                <span className={`text-[10px] leading-tight transition-colors duration-200 truncate w-full ${
                  isSelected ? 'text-brand-300/60' : 'text-white/20'
                }`}>
                  {tmpl.description}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="template-indicator"
                    className="absolute -bottom-px left-3 right-3 h-0.5 bg-brand-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-600/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative glass glow-sm p-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 pl-3">
                <Globe className="w-5 h-5 text-white/25 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={EXAMPLE_DOMAINS[placeholderIndex]}
                  className="flex-1 bg-transparent text-white placeholder:text-white/20 text-base font-medium outline-none py-3"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                disabled={!domain.trim() || isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-brand-500/40"
              >
                <Search className="w-4 h-4" />
                <span>Research</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Tone selector */}
        <OnboardingHint visible={!hasSeenToneHint} onDismiss={dismissToneHint}>
          This controls the tone of outreach emails in your report
        </OnboardingHint>
        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mr-1">Tone</span>
          {TONE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => setSelectedTone(opt.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedTone === opt.value
                  ? 'bg-brand-500/20 border border-brand-500/30 text-brand-300'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <motion.button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-1.5 mx-auto mt-4 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            <span>Add sender context for better personalization</span>
            <motion.div animate={{ rotate: showContext ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
          <OnboardingHint visible={!hasSeenContextHint} onDismiss={dismissContextHint}>
            Add your product info for hyper-personalized outreach emails
          </OnboardingHint>
        </div>

        <AnimatePresence>
          {showContext && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="glass p-3 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-white/20 shrink-0" />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name"
                    className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
                  />
                </div>
                <div className="glass p-3 flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-white/20 shrink-0" />
                  <input
                    type="text"
                    value={senderCompany}
                    onChange={(e) => setSenderCompany(e.target.value)}
                    placeholder="Your company"
                    className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
                  />
                </div>
                <div className="glass p-3 flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-white/20 shrink-0" />
                  <input
                    type="text"
                    value={senderRole}
                    onChange={(e) => setSenderRole(e.target.value)}
                    placeholder="Your role"
                    className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
                  />
                </div>
              </div>

              {/* Seller context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="glass p-3 flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-white/20 shrink-0" />
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Your product"
                    className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
                  />
                </div>
                <div className="glass p-3 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                  <textarea
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    placeholder="Your value proposition"
                    rows={1}
                    className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1 resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
