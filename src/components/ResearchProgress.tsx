import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Brain, BriefcaseBusiness, Mail, Check, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import type { ResearchProgress as ResearchProgressType, ResearchStage } from '@/types/prospect'
import type { ScrapeDetail } from '@/hooks/useResearch'

interface StageConfig {
  key: ResearchStage
  label: string
  icon: React.ElementType
  description: string
}

const STAGES: StageConfig[] = [
  { key: 'scraping', label: 'Scraping Website', icon: Globe, description: 'Crawling pages and extracting data' },
  { key: 'analyzing', label: 'Analyzing Data', icon: Brain, description: 'Identifying patterns and insights' },
  { key: 'jobs', label: 'Scanning Jobs', icon: BriefcaseBusiness, description: 'Analyzing hiring signals' },
  { key: 'generating', label: 'Generating Outreach', icon: Mail, description: 'Crafting personalized email' },
]

const STAGE_ORDER: Record<string, number> = {
  scraping: 0,
  analyzing: 1,
  jobs: 2,
  generating: 3,
  complete: 4,
}

interface ResearchProgressProps {
  progress: ResearchProgressType
  scrapeLog?: ScrapeDetail[]
}

function ScrapeStatusIcon({ status }: { status: ScrapeDetail['status'] }) {
  switch (status) {
    case 'fetching':
      return <Loader2 className="w-3 h-3 text-brand-400 animate-spin" />
    case 'success':
      return <CheckCircle className="w-3 h-3 text-emerald-400" />
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-400" />
  }
}

export function ResearchProgress({ progress, scrapeLog = [] }: ResearchProgressProps) {
  const currentIndex = STAGE_ORDER[progress.stage] ?? -1
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [scrapeLog.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4"
        >
          <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
          <span className="text-xs font-medium text-brand-300">Researching</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white/90 mb-2">Deep diving in progress</h2>
        <p className="text-sm text-white/40">Our AI agent is gathering intelligence</p>
      </div>

      {/* Progress bar */}
      <div className="mb-10">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={progress.message}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-white/30"
            >
              {progress.message}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-white/30 font-mono">{Math.round(progress.progress)}%</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {STAGES.map((stage, i) => {
          const isComplete = currentIndex > i
          const isActive = currentIndex === i
          const isPending = currentIndex < i

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                isActive ? 'glass glow-sm' : ''
              }`}>
                {/* Icon */}
                <div className="relative shrink-0">
                  {isComplete && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
                    >
                      <Check className="w-4.5 h-4.5 text-emerald-400" />
                    </motion.div>
                  )}
                  {isActive && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand-500/30 rounded-xl blur-md animate-pulse-slow" />
                      <div className="relative w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
                        <stage.icon className="w-4.5 h-4.5 text-brand-400" />
                      </div>
                    </div>
                  )}
                  {isPending && (
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <stage.icon className="w-4.5 h-4.5 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className={`text-sm font-semibold transition-colors duration-300 ${
                    isComplete ? 'text-emerald-400/80' : isActive ? 'text-white/90' : 'text-white/25'
                  }`}>
                    {stage.label}
                  </div>
                  <div className={`text-xs transition-colors duration-300 mt-0.5 ${
                    isActive ? 'text-white/40' : 'text-white/15'
                  }`}>
                    {isActive ? progress.message || stage.description : stage.description}
                  </div>
                </div>

                {/* Status indicator */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-1"
                  >
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full bg-brand-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, delay: dot * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </motion.div>
                )}
                {isComplete && (
                  <span className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-wider">Done</span>
                )}
              </div>

              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div className="ml-[19px] h-1 flex items-center">
                  <div className={`w-0.5 h-full transition-colors duration-500 ${
                    isComplete ? 'bg-emerald-500/30' : 'bg-white/[0.04]'
                  }`} />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Live activity feed */}
      {scrapeLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-3.5 h-3.5 text-white/20" />
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Live Activity</span>
          </div>
          <div
            ref={feedRef}
            className="glass p-3 max-h-[140px] overflow-y-auto space-y-1.5"
          >
            <AnimatePresence>
              {scrapeLog.map((entry) => (
                <motion.div
                  key={`${entry.url}-${entry.status}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <ScrapeStatusIcon status={entry.status} />
                  <span className="text-[11px] font-mono text-white/30 truncate flex-1">
                    {entry.url}
                  </span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider shrink-0 ${
                    entry.status === 'fetching' ? 'text-brand-400/50' :
                    entry.status === 'success' ? 'text-emerald-400/50' :
                    'text-red-400/50'
                  }`}>
                    {entry.status}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
