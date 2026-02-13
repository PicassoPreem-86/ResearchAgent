import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Globe, ArrowRight, Crosshair, Users, X, Save, Loader2 } from 'lucide-react'
import type { ICP } from '@/types/prospect'

const EXAMPLE_DOMAINS = [
  'stripe.com',
  'notion.so',
  'linear.app',
  'vercel.com',
  'figma.com',
]

const SIZE_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
]

const FUNDING_OPTIONS = [
  { value: '', label: 'Any stage' },
  { value: 'Pre-seed', label: 'Pre-seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C+', label: 'Series C+' },
  { value: 'Public', label: 'Public' },
]

type DiscoverMode = 'lookalike' | 'icp'

interface DiscoverInputProps {
  onSearchLookalike: (domain: string) => void
  onSearchICP: (icp: ICP) => void
  onSaveICP: (icp: ICP) => Promise<void>
  loadICP: () => Promise<ICP | null>
  isLoading: boolean
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (index: number) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = input.trim().replace(/,$/, '')
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed)
        setInput('')
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags.length - 1)
    }
  }

  return (
    <div
      className="glass p-3 flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <motion.span
          key={tag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-500/15 border border-brand-500/25 text-xs font-medium text-brand-300"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(i)
            }}
            className="text-brand-300/50 hover:text-brand-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1 min-w-[80px] py-0.5"
      />
    </div>
  )
}

export function DiscoverInput({ onSearchLookalike, onSearchICP, onSaveICP, loadICP, isLoading }: DiscoverInputProps) {
  const [mode, setMode] = useState<DiscoverMode>('lookalike')
  const [domain, setDomain] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [industries, setIndustries] = useState<string[]>([])
  const [sizeRange, setSizeRange] = useState('')
  const [techStack, setTechStack] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [geography, setGeography] = useState('')
  const [fundingStage, setFundingStage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [icpLoaded, setIcpLoaded] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % EXAMPLE_DOMAINS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const loadSavedICP = useCallback(async () => {
    if (icpLoaded) return
    const saved = await loadICP()
    if (saved) {
      setIndustries(saved.industries || [])
      setSizeRange(saved.sizeRange || '')
      setTechStack(saved.techStack || [])
      setKeywords(saved.keywords || [])
      setGeography(saved.geography || '')
      setFundingStage(saved.fundingStage || '')
    }
    setIcpLoaded(true)
  }, [loadICP, icpLoaded])

  useEffect(() => {
    if (mode === 'icp') {
      loadSavedICP()
    }
  }, [mode, loadSavedICP])

  const buildICP = (): ICP => ({
    industries,
    sizeRange,
    techStack,
    keywords,
    geography,
    fundingStage,
  })

  const icpValid = industries.length > 0 || keywords.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    if (mode === 'lookalike') {
      if (!domain.trim()) return
      onSearchLookalike(domain.trim())
    } else {
      if (!icpValid) return
      onSearchICP(buildICP())
    }
  }

  const handleSaveICP = async () => {
    if (!icpValid) return
    setIsSaving(true)
    try {
      await onSaveICP(buildICP())
    } finally {
      setIsSaving(false)
    }
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
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-brand-300 tracking-wide">Company Discovery</span>
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          <span className="text-white/95">Find your next</span>
          <br />
          <span className="gradient-text">best customer</span>
        </h1>
        <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
          Discover companies that match your ideal profile or find lookalikes of your best customers.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMode('lookalike')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              mode === 'lookalike'
                ? 'bg-white/[0.08] text-white/80 shadow-sm'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Lookalike
          </button>
          <button
            type="button"
            onClick={() => setMode('icp')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              mode === 'icp'
                ? 'bg-white/[0.08] text-white/80 shadow-sm'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            ICP Search
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {mode === 'lookalike' ? (
            <motion.div
              key="lookalike"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-600/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative glass glow-sm p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 pl-3">
                      <Globe className="w-5 h-5 text-white/25 shrink-0" />
                      <input
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
                      <Crosshair className="w-4 h-4" />
                      <span>Find Similar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-white/20 mt-3">
                Enter a company you love selling to and we'll find similar ones
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="icp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Industry + Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Industries
                  </label>
                  <TagInput
                    tags={industries}
                    onAdd={(t) => setIndustries([...industries, t])}
                    onRemove={(i) => setIndustries(industries.filter((_, idx) => idx !== i))}
                    placeholder="SaaS, Fintech, Healthcare..."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Keywords
                  </label>
                  <TagInput
                    tags={keywords}
                    onAdd={(t) => setKeywords([...keywords, t])}
                    onRemove={(i) => setKeywords(keywords.filter((_, idx) => idx !== i))}
                    placeholder="AI, developer tools, B2B..."
                  />
                </div>
              </div>

              {/* Size + Funding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Company Size
                  </label>
                  <select
                    value={sizeRange}
                    onChange={(e) => setSizeRange(e.target.value)}
                    className="w-full glass p-3 bg-transparent text-sm text-white outline-none appearance-none cursor-pointer [&>option]:bg-gray-900 [&>option]:text-white"
                  >
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Funding Stage
                  </label>
                  <select
                    value={fundingStage}
                    onChange={(e) => setFundingStage(e.target.value)}
                    className="w-full glass p-3 bg-transparent text-sm text-white outline-none appearance-none cursor-pointer [&>option]:bg-gray-900 [&>option]:text-white"
                  >
                    {FUNDING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tech Stack + Geography */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Tech Stack
                  </label>
                  <TagInput
                    tags={techStack}
                    onAdd={(t) => setTechStack([...techStack, t])}
                    onRemove={(i) => setTechStack(techStack.filter((_, idx) => idx !== i))}
                    placeholder="React, AWS, Python..."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
                    Geography
                  </label>
                  <div className="glass p-3">
                    <input
                      type="text"
                      value={geography}
                      onChange={(e) => setGeography(e.target.value)}
                      placeholder="US, Europe, Global..."
                      className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <motion.button
                  type="button"
                  onClick={handleSaveICP}
                  disabled={!icpValid || isSaving}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all disabled:opacity-30"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save ICP
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={!icpValid || isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-brand-500/40"
                >
                  <Search className="w-4 h-4" />
                  <span>Discover Companies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
