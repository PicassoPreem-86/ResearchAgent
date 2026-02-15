import { motion } from 'framer-motion'
import { Search, TrendingUp, Swords, Handshake, Mail } from 'lucide-react'
import { OnboardingHint } from '@/components/OnboardingHint'
import type { EmailTone, ReportTemplate } from '@/types/prospect'

interface TemplateOption {
  value: ReportTemplate
  label: string
  description: string
  icon: React.ElementType
}

const TEMPLATES: TemplateOption[] = [
  { value: 'general', label: 'General Research', description: 'Balanced overview', icon: Search },
  { value: 'investor-dd', label: 'Investor DD', description: 'Due diligence brief', icon: TrendingUp },
  { value: 'competitive-analysis', label: 'Competitive Analysis', description: 'Market positioning', icon: Swords },
  { value: 'partnership-eval', label: 'Partnership Eval', description: 'Fit & synergy analysis', icon: Handshake },
  { value: 'sales-research', label: 'Sales Research', description: 'Pain points & outreach', icon: Mail },
]

const TONE_OPTIONS: { value: EmailTone; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'provocative', label: 'Provocative' },
  { value: 'consultative', label: 'Consultative' },
]

interface TemplateSelectorProps {
  selectedTemplate: ReportTemplate
  onSelectTemplate: (t: ReportTemplate) => void
  selectedTone: EmailTone
  onSelectTone: (t: EmailTone) => void
  hasSeenLensHint: boolean
  hasSeenToneHint: boolean
  dismissLensHint: () => void
  dismissToneHint: () => void
}

export function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  selectedTone,
  onSelectTone,
  hasSeenLensHint,
  hasSeenToneHint,
  dismissLensHint,
  dismissToneHint,
}: TemplateSelectorProps) {
  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3 text-center">Research Lens</div>
        <OnboardingHint visible={!hasSeenLensHint} onDismiss={dismissLensHint} position="above">
          Choose what angle matters most — this shapes the entire report
        </OnboardingHint>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon
            const isSelected = selectedTemplate === tmpl.value
            return (
              <motion.button
                key={tmpl.value}
                type="button"
                onClick={() => onSelectTemplate(tmpl.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-3 sm:py-3.5 rounded-xl border text-center transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500/30 shadow-lg shadow-brand-500/10'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors duration-200 ${
                  isSelected ? 'bg-brand-500/20' : 'bg-white/[0.04]'
                }`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-400' : 'text-white/30'}`} />
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold transition-colors duration-200 truncate w-full ${
                  isSelected ? 'text-brand-300' : 'text-white/50'
                }`}>
                  {tmpl.label}
                </span>
                <span className={`text-[10px] leading-tight transition-colors duration-200 truncate w-full ${
                  isSelected ? 'text-brand-300/60' : 'text-white/20'
                }`}>
                  {tmpl.description}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="template-indicator"
                    className="absolute -bottom-px left-3 right-3 h-0.5 bg-brand-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Tone selector */}
      <OnboardingHint visible={!hasSeenToneHint} onDismiss={dismissToneHint}>
        This controls the tone of outreach emails in your report
      </OnboardingHint>
      <div className="flex items-center justify-center gap-2 mt-5">
        <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mr-1">Tone</span>
        {TONE_OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onSelectTone(opt.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              selectedTone === opt.value
                ? 'bg-brand-500/20 border border-brand-500/30 text-brand-300'
                : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </>
  )
}

export { TEMPLATES, TONE_OPTIONS }
