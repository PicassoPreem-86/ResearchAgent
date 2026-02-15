import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'

const EXAMPLE_DOMAINS = [
  'stripe.com',
  'notion.so',
  'linear.app',
  'vercel.com',
  'figma.com',
  'datadog.com',
  'airtable.com',
]

interface SearchExamplesProps {
  onLoadExample?: () => void
}

export function SearchExamples({ onLoadExample }: SearchExamplesProps) {
  if (!onLoadExample) return null

  return (
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
  )
}

export { EXAMPLE_DOMAINS }
