import type { SectionConfidence } from '@/types/prospect'

interface SectionConfidenceIndicatorProps {
  confidence: SectionConfidence | undefined
}

export function SectionConfidenceIndicator({ confidence }: SectionConfidenceIndicatorProps) {
  if (!confidence) return null

  const score = confidence.score
  const color =
    score >= 75 ? 'bg-emerald-400' :
    score >= 50 ? 'bg-amber-400' :
    score >= 25 ? 'bg-orange-400' :
    'bg-red-400'

  const textColor =
    score >= 75 ? 'text-emerald-400' :
    score >= 50 ? 'text-amber-400' :
    score >= 25 ? 'text-orange-400' :
    'text-red-400'

  return (
    <div className="flex items-center gap-2 ml-auto" title={confidence.reasoning}>
      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${textColor} tabular-nums`}>
        {score}%
      </span>
    </div>
  )
}
