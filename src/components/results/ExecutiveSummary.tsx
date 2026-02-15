import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { SectionHeader } from './SectionHeader'

interface ExecutiveSummaryProps {
  summary: string
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.03 }}
      className="mb-8"
    >
      <SectionHeader icon={FileText} title="Executive Summary" accent="text-brand-400" />
      <div className="glass p-6 border-l-2 border-l-brand-500/40">
        <p className="text-sm text-white/55 leading-relaxed">{summary}</p>
      </div>
    </motion.div>
  )
}
