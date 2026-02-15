import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserSearch, Briefcase, ArrowRight, ChevronDown } from 'lucide-react'
import { GeoPicker } from '@/components/GeoPicker'
import { TagInput } from '@/components/TagInput'
import type { GeoTarget } from '@/types/prospect'
import { EMPTY_GEO_TARGET, hasGeoSelections } from '@/types/prospect'

const SENIORITY_OPTIONS = [
  { value: 'any', label: 'Any Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Staff' },
  { value: 'director', label: 'Director+' },
]

interface TalentInputProps {
  onSearch: (targetRole: string, targetSkills: string[], location?: GeoTarget, seniority?: string) => void
  isLoading: boolean
}

export function TalentInput({ onSearch, isLoading }: TalentInputProps) {
  const [targetRole, setTargetRole] = useState('')
  const [targetSkills, setTargetSkills] = useState<string[]>([])
  const [location, setLocation] = useState<GeoTarget>({ ...EMPTY_GEO_TARGET })
  const [seniority, setSeniority] = useState('any')

  const isValid = targetRole.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return
    onSearch(
      targetRole.trim(),
      targetSkills,
      hasGeoSelections(location) ? location : undefined,
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
          <TagInput
            tags={targetSkills}
            onAdd={(t) => setTargetSkills([...targetSkills, t])}
            onRemove={(i) => setTargetSkills(targetSkills.filter((_, idx) => idx !== i))}
            placeholder="React, TypeScript, Node.js..."
            accent="cyan"
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
            Location <span className="text-white/15">(optional)</span>
          </label>
          <GeoPicker value={location} onChange={setLocation} disabled={isLoading} accent="cyan" />
        </div>

        {/* Seniority */}
        <div>
          <label className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5 block">
            Seniority <span className="text-white/15">(optional)</span>
          </label>
          <div className="glass p-3 flex items-center gap-2.5 relative max-w-xs">
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
