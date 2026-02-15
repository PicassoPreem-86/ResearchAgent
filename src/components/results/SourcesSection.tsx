import { motion } from 'framer-motion'
import { FileText, ExternalLink } from 'lucide-react'
import type { DataFreshness } from '@/types/prospect'
import { SectionHeader } from './SectionHeader'

interface SourcesSectionProps {
  freshness: DataFreshness
}

const CATEGORY_LABELS: Record<string, string> = {
  homepage: 'Homepage',
  about: 'About',
  careers: 'Careers',
  pricing: 'Pricing',
  blog: 'Blog / Resources',
  team: 'Team',
  product: 'Product',
  press: 'Press',
  partners: 'Partners',
  customers: 'Customers',
  developer: 'Developer',
  changelog: 'Changelog',
  enterprise: 'Enterprise',
  sales: 'Sales',
}

function formatCharCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k chars`
  return `${count} chars`
}

export function SourcesSection({ freshness }: SourcesSectionProps) {
  if (!freshness.sources || freshness.sources.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="mb-8"
    >
      <SectionHeader icon={FileText} title="Sources" accent="text-white/40" />
      <div className="glass p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {freshness.sources.map((source, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/50">
                    {CATEGORY_LABELS[source.category] || source.category}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {formatCharCount(source.charCount)}
                  </span>
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-white/25 hover:text-brand-400 truncate block transition-colors"
                >
                  {source.url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-2.5 h-2.5 inline ml-1 -mt-0.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
