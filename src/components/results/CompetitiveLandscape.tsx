import { motion } from 'framer-motion'
import { Swords, AlertTriangle } from 'lucide-react'
import type { CompetitiveLandscape as CompetitiveLandscapeType } from '@/types/prospect'
import { SectionHeader } from './SectionHeader'

interface CompetitiveLandscapeProps {
  landscape: CompetitiveLandscapeType
}

export function CompetitiveLandscape({ landscape }: CompetitiveLandscapeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.42 }}
      className="mb-8"
    >
      <SectionHeader icon={Swords} title="Competitive Landscape" accent="text-blue-400" />
      <div className="glass p-6">
        {landscape.moat && (
          <div className="mb-5">
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Competitive Moat</div>
            <p className="text-sm text-white/50 leading-relaxed">{landscape.moat}</p>
          </div>
        )}
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Known Competitors</div>
        <div className="space-y-2 mb-5">
          {landscape.competitors.map((comp, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-blue-300">{comp.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white/70">{comp.name}</span>
                  {comp.domain && (
                    <span className="text-[10px] text-white/25">{comp.domain}</span>
                  )}
                </div>
                <p className="text-xs text-white/35 leading-relaxed">{comp.positioning}</p>
              </div>
            </div>
          ))}
        </div>
        {landscape.vulnerabilities && landscape.vulnerabilities.length > 0 && (
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Competitive Vulnerabilities</div>
            <div className="space-y-1.5">
              {landscape.vulnerabilities.map((vuln, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400/40 mt-0.5 shrink-0" />
                  <span className="text-xs text-white/40 leading-relaxed">{vuln}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
