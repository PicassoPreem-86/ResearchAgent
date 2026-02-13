import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { UserSearch, Briefcase, ArrowRight, X, MapPin, ChevronDown } from 'lucide-react'

const SENIORITY_OPTIONS = [
  { value: 'any', label: 'Any Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Staff' },
  { value: 'director', label: 'Director+' },
]

interface TalentInputProps {
  onSearch: (targetRole: string, targetSkills: string[], location?: string, seniority?: string) => void
  isLoading: boolean
}

function SkillTagInput({
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
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/25 text-xs font-medium text-cyan-300"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(i)
            }}
            className="text-cyan-300/50 hover:text-cyan-300 transition-colors"
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

export function TalentInput({ onSearch, isLoading }: TalentInputProps) {
  const [targetRole, setTargetRole] = useState('')
  const [targetSkills, setTargetSkills] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [seniority, setSeniority] = useState('any')

  const isValid = targetRole.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return
    onSearch(
      targetRole.trim(),
      targetSkills,
      location.trim() || undefined,
      seniority !== 'any' ? seniority : undefined
    )
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
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-300 tracking-wide">Hiring Intelligence</span>
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          <span className="text-white/95">Find your</span>
          <br />
          <span className="gradient-text">next hire</span>
        </h1>
        <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
          Search LinkedIn, GitHub, and more for candidates that match your role. Get fit scores and ready-to-send outreach.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target role */}
        <div>
          <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
            Role You're Hiring For
          </label>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600/20 via-brand-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative glass glow-sm p-2">
              <div className="flex items-center gap-2 pl-3">
                <Briefcase className="w-5 h-5 text-white/25 shrink-0" />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Senior Frontend Engineer"
                  className="flex-1 bg-transparent text-white placeholder:text-white/20 text-base font-medium outline-none py-3"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>

        {/* Target skills */}
        <div>
          <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
            Required Skills <span className="text-white/15">(optional)</span>
          </label>
          <SkillTagInput
            tags={targetSkills}
            onAdd={(t) => setTargetSkills([...targetSkills, t])}
            onRemove={(i) => setTargetSkills(targetSkills.filter((_, idx) => idx !== i))}
            placeholder="React, TypeScript, Node.js..."
          />
        </div>

        {/* Location and seniority row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
              Location <span className="text-white/15">(optional)</span>
            </label>
            <div className="glass p-3 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-white/20 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, Remote..."
                className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
              Seniority <span className="text-white/15">(optional)</span>
            </label>
            <div className="glass p-3 flex items-center gap-2.5 relative">
              <ChevronDown className="w-4 h-4 text-white/20 shrink-0" />
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-sm text-white outline-none flex-1 appearance-none cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <motion.button
            type="submit"
            disabled={!isValid || isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-cyan-500/40"
          >
            <UserSearch className="w-4 h-4" />
            <span>Search Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}
