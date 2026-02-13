import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  X,
  ArrowRight,
  List,
  ChevronDown,
  User,
  Building2,
  Briefcase,
} from 'lucide-react'

interface BulkModeProps {
  onStartBulk: (domains: string[], senderContext?: {
    senderName?: string
    senderCompany?: string
    senderRole?: string
  }) => void
  isLoading: boolean
}

export function BulkMode({ onStartBulk, isLoading }: BulkModeProps) {
  const [domainText, setDomainText] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderCompany, setSenderCompany] = useState('')
  const [senderRole, setSenderRole] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseDomains = useCallback((): string[] => {
    if (!domainText.trim()) return []
    return domainText
      .split(/[\n,;]+/)
      .map((d) => d.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter((d) => d.length > 0 && d.includes('.'))
  }, [domainText])

  const domainCount = parseDomains().length

  const handleFileChange = (file: File) => {
    if (!file) return
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) setDomainText(text)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileChange(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const domains = parseDomains()
    if (domains.length === 0 || isLoading) return

    const ctx = showContext
      ? {
          senderName: senderName || undefined,
          senderCompany: senderCompany || undefined,
          senderRole: senderRole || undefined,
        }
      : undefined
    onStartBulk(domains, ctx)
  }

  const clearFile = () => {
    setCsvFile(null)
    setDomainText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          <span className="text-xs font-medium text-brand-300 tracking-wide">Bulk Research Mode</span>
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          <span className="text-white/95">Research at</span>
          <br />
          <span className="gradient-text">scale</span>
        </h1>
        <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
          Paste domains, upload a CSV, or drop a file to research multiple companies at once.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Textarea with drop zone */}
        <div
          className={`relative group transition-all duration-300 ${isDragging ? 'scale-[1.02]' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className={`absolute -inset-0.5 rounded-2xl blur-lg transition-opacity duration-500 ${
            isDragging
              ? 'bg-gradient-to-r from-brand-600/30 via-blue-500/30 to-cyan-500/30 opacity-100'
              : 'bg-gradient-to-r from-brand-600/20 via-blue-500/20 to-cyan-500/20 opacity-0 group-focus-within:opacity-100'
          }`} />
          <div className="relative glass glow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-white/25" />
                <span className="text-xs text-white/30 font-medium">One domain per line</span>
              </div>
              <div className="flex items-center gap-2">
                {csvFile && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20"
                  >
                    <FileText className="w-3 h-3 text-brand-400" />
                    <span className="text-xs text-brand-300 max-w-[120px] truncate">{csvFile.name}</span>
                    <button type="button" onClick={clearFile} className="text-white/30 hover:text-white/60 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
                {domainCount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-500/15 text-brand-300 border border-brand-500/20"
                  >
                    {domainCount} domain{domainCount !== 1 ? 's' : ''}
                  </motion.span>
                )}
              </div>
            </div>

            <textarea
              value={domainText}
              onChange={(e) => {
                setDomainText(e.target.value)
                setCsvFile(null)
              }}
              placeholder={`stripe.com\nnotion.so\nlinear.app\nvercel.com`}
              rows={6}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/15 outline-none resize-none leading-relaxed font-mono"
              disabled={isLoading}
            />

            {/* Action row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileChange(file)
                  }}
                />
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV
                </motion.button>
              </div>

              <motion.button
                type="submit"
                disabled={domainCount === 0 || isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-brand-500/40"
              >
                <span>Research All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Sender context toggle */}
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
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
