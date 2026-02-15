import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { SectionHeader } from './SectionHeader'

interface StrategicRecommendationsProps {
  recommendations: string[]
}

export function StrategicRecommendations({ recommendations }: StrategicRecommendationsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.44 }}
      className="mb-8"
    >
      <SectionHeader icon={Lightbulb} title="Strategic Recommendations" accent="text-amber-400" />
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.44 + i * 0.05 }}
            className="glass p-4 flex items-start gap-3"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-amber-300">{i + 1}</span>
            </div>
            <p className="text-xs text-white/45 leading-relaxed">{rec}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
