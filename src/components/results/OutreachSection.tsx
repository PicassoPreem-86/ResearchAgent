import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { OutreachEmail } from '@/types/prospect'
import { EmailPreview } from '../EmailPreview'

interface OutreachSectionProps {
  email: OutreachEmail
  emails: OutreachEmail[]
  recipientDomain: string
  onToast: (message: string, variant?: 'success' | 'error') => void
}

export function OutreachSection({ email, emails, recipientDomain, onToast }: OutreachSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="mb-12"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-brand-500/15 to-brand-600/10 border border-brand-500/20">
          <Sparkles className="w-4 h-4 text-brand-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white/80">Personalized Outreach</h3>
          <p className="text-xs text-white/30">AI-crafted based on research findings</p>
        </div>
      </div>
      <EmailPreview email={email} emails={emails} recipientDomain={recipientDomain} onToast={onToast} />
    </motion.div>
  )
}
