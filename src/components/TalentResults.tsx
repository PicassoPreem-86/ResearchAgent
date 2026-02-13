import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Globe,
  UserSearch,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Users,
  Mail,
} from 'lucide-react'
import type { TalentReport, TalentProfile, TalentInsight } from '@/types/prospect'
import { EmailPreview } from './EmailPreview'

interface TalentResultsProps {
  report: TalentReport
  onReset: () => void
}

function MatchScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 14
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-brand-400' : 'stroke-white/30'
  const textColor =
    score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-brand-400' : 'text-white/40'
  const trackColor =
    score >= 80 ? 'stroke-emerald-500/15' : score >= 60 ? 'stroke-brand-500/15' : 'stroke-white/[0.06]'

  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="none" strokeWidth="2" className={trackColor} />
        <motion.circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[10px] font-bold ${textColor}`}>{score}</span>
      </div>
    </div>
  )
}

function InsightCard({ insight }: { insight: TalentInsight }) {
  const signalConfig = {
    positive: {
      icon: TrendingUp,
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      label: 'text-emerald-300/70',
      badge: 'Opportunity',
    },
    negative: {
      icon: TrendingDown,
      bg: 'bg-red-500/10 border-red-500/20',
      iconColor: 'text-red-400',
      label: 'text-red-300/70',
      badge: 'Challenge',
    },
    neutral: {
      icon: Minus,
      bg: 'bg-white/[0.04] border-white/[0.06]',
      iconColor: 'text-white/40',
      label: 'text-white/40',
      badge: 'Info',
    },
  }
  const config = signalConfig[insight.signal]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-4 border ${config.bg}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white/[0.04] shrink-0">
          <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs font-semibold text-white/70">{insight.title}</h4>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${config.label} ${config.bg}`}>
              {config.badge}
            </span>
          </div>
          <p className="text-xs text-white/35 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

function ProfileCard({ profile, index }: { profile: TalentProfile; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass glass-hover p-5"
    >
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/15 to-brand-600/10 border border-cyan-500/15 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-cyan-300">
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white/85">{profile.name}</h3>
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300/70 font-medium hover:bg-blue-500/20 transition-colors"
              >
                LinkedIn
              </a>
            )}
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 font-medium hover:bg-white/[0.08] transition-colors"
              >
                GitHub
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/40">{profile.role}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/15 text-cyan-300/60 font-medium">
              {profile.department}
            </span>
          </div>

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/35"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Match reasons */}
          {profile.matchReasons.length > 0 && (
            <div className="mb-3">
              <span className="text-[9px] text-white/20 uppercase tracking-wider font-semibold">Match reasons</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.matchReasons.map((reason, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/15 text-brand-300/60"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recruiting angle */}
          {profile.recruitingAngle && (
            <div className="flex items-start gap-1.5 pt-2 border-t border-white/[0.04]">
              <Sparkles className="w-3 h-3 text-amber-400/50 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-200/40 leading-relaxed italic">
                {profile.recruitingAngle}
              </p>
            </div>
          )}
        </div>

        {/* Score ring */}
        <MatchScoreRing score={profile.matchScore} />
      </div>
    </motion.div>
  )
}

export function TalentResults({ report, onReset }: TalentResultsProps) {
  const [minScore, setMinScore] = useState(0)

  const filteredProfiles = useMemo(() => {
    return report.profiles
      .filter((p) => p.matchScore >= minScore)
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [report.profiles, minScore])

  const hasInsights = report.talentInsights && report.talentInsights.length > 0
  const hasProfiles = report.profiles && report.profiles.length > 0
  const hasTeamComp = report.teamComposition && (report.teamComposition.departments.length > 0 || report.teamComposition.teamCulture)
  const hasPersonalOutreach = report.personalizedOutreach && report.personalizedOutreach.length > 0

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
          Search another
        </button>
        <div className="text-xs text-white/20 font-mono">
          {new Date(report.generatedAt).toLocaleString()}
        </div>
      </motion.div>

      {/* Company header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass glow p-6 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
            <UserSearch className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white/90 mb-1">Talent Report</h2>
            <div className="flex items-center gap-3 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {report.company.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {report.company.domain}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-cyan-300">{report.profiles.length}</div>
              <div className="text-[10px] text-white/25">profiles</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs font-semibold text-cyan-300">{report.targetRole}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Talent Insights */}
      {hasInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white/80">Talent Insights</h3>
            <span className="text-[10px] text-white/20 ml-auto">{report.talentInsights.length} signals</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.talentInsights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Team Composition */}
      {hasTeamComp && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Users className="w-4 h-4 text-brand-400" />
            </div>
            <h3 className="text-base font-semibold text-white/80">Team Composition</h3>
          </div>
          <div className="glass p-6">
            {report.teamComposition.departments.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Department Breakdown</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {report.teamComposition.departments.map((dept, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-cyan-300">{dept.count}</span>
                      </div>
                      <span className="text-xs text-white/50 font-medium">{dept.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.teamComposition.seniorityBreakdown && (
              <div className="mb-4">
                <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Seniority</div>
                <p className="text-xs text-white/40 leading-relaxed">{report.teamComposition.seniorityBreakdown}</p>
              </div>
            )}
            {report.teamComposition.teamCulture && (
              <div>
                <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Culture Signals</div>
                <p className="text-xs text-white/40 leading-relaxed">{report.teamComposition.teamCulture}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Profiles section */}
      {hasProfiles && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <UserSearch className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-base font-semibold text-white/80">Team Members</h3>
            </div>

            {/* Min score filter */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Min Score</span>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-20 h-1 appearance-none bg-white/[0.06] rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-[11px] font-mono text-white/30 w-6 text-right">{minScore}</span>
            </div>
          </div>

          <div className="text-xs text-white/20 mb-3">
            Showing {filteredProfiles.length} of {report.profiles.length} profiles
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filteredProfiles.map((profile, i) => (
                <ProfileCard key={profile.name} profile={profile} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {filteredProfiles.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
                <UserSearch className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-sm text-white/30">
                No profiles match the current filter. Try lowering the minimum score.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* No profiles found at all */}
      {!hasProfiles && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center py-16 mb-8"
        >
          <div className="inline-flex p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
            <UserSearch className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/60 mb-2">No profiles found</h3>
          <p className="text-sm text-white/30 max-w-sm mx-auto">
            We couldn't find team members on this company's public pages. Try a company with a public team or about page.
          </p>
        </motion.div>
      )}

      {/* Per-Person Outreach */}
      {hasPersonalOutreach && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/15 to-brand-600/10 border border-cyan-500/20">
              <Mail className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/80">Personalized Outreach</h3>
              <p className="text-xs text-white/30">Individual emails for top matches</p>
            </div>
          </div>
          <div className="space-y-4">
            {report.personalizedOutreach.map((po, i) => (
              <div key={i} className="glass p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-cyan-300">
                      {po.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white/70">For {po.name}</span>
                </div>
                <EmailPreview email={po.email} recipientDomain={report.company.domain} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recruiting Email */}
      {report.recruitingEmail && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/15 to-brand-600/10 border border-cyan-500/20">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/80">Recruiting Outreach</h3>
              <p className="text-xs text-white/30">AI-crafted based on company research</p>
            </div>
          </div>
          <EmailPreview
            email={report.recruitingEmail}
            recipientDomain={report.company.domain}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
