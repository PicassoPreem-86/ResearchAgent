import { useMemo } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import type { ProspectReport } from '@/types/prospect'
import { reportToRadarScores, type RadarScore } from '@/utils/chartHelpers'
import { SectionHeader } from './SectionHeader'

interface MarketRadarProps {
  report: ProspectReport
  comparisonReports?: Array<{ name: string; report: ProspectReport }>
}

const COLORS = [
  { fill: 'rgba(92, 124, 250, 0.20)', stroke: '#5c7cfa' },
  { fill: 'rgba(34, 211, 238, 0.15)', stroke: '#22d3ee' },
  { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24' },
  { fill: 'rgba(167, 139, 250, 0.15)', stroke: '#a78bfa' },
]

interface RadarTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: RadarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs font-semibold text-white/70 mb-2">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-white/50">{entry.name}:</span>
          <span className="text-white/80 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function CustomAngleLabel(props: Record<string, unknown>) {
  const { payload, x, y, cx, cy } = props as { payload: { value: string }; x: number; y: number; cx: number; cy: number }
  const dx = x - cx
  const dy = y - cy
  const len = Math.sqrt(dx * dx + dy * dy)
  const offsetX = len > 0 ? (dx / len) * 14 : 0
  const offsetY = len > 0 ? (dy / len) * 14 : 0
  return (
    <text
      x={x + offsetX}
      y={y + offsetY}
      textAnchor={x + offsetX > cx ? 'start' : x + offsetX < cx ? 'end' : 'middle'}
      dominantBaseline="central"
      fill="rgba(255,255,255,0.40)"
      fontSize={10}
      fontWeight={500}
    >
      {payload.value}
    </text>
  )
}

export function MarketRadar({ report, comparisonReports }: MarketRadarProps) {
  const scores = useMemo(() => reportToRadarScores(report), [report])

  const comparisonScores = useMemo(() => {
    if (!comparisonReports?.length) return []
    return comparisonReports.map((cr) => ({
      name: cr.name,
      scores: reportToRadarScores(cr.report),
    }))
  }, [comparisonReports])

  const mergedData = useMemo(() => {
    return scores.map((s) => {
      const entry: Record<string, string | number> = {
        dimension: s.dimension,
        [report.company.name]: s.score,
        fullMark: 100,
      }
      comparisonScores.forEach((cs) => {
        const match = cs.scores.find((d: RadarScore) => d.dimension === s.dimension)
        if (match) entry[cs.name] = match.score
      })
      return entry
    })
  }, [scores, comparisonScores, report.company.name])

  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <SectionHeader icon={Activity} title="Market Radar" accent="text-brand-400" />
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Overall Score</div>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${avgScore}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-semibold text-brand-400">{avgScore}</span>
          </div>
        </div>

        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={mergedData} outerRadius="75%">
              <PolarGrid
                stroke="rgba(255,255,255,0.06)"
                gridType="polygon"
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={CustomAngleLabel}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name={report.company.name}
                dataKey={report.company.name}
                fill={COLORS[0].fill}
                stroke={COLORS[0].stroke}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[0].stroke, fillOpacity: 1 }}
              />
              {comparisonScores.map((cs, i) => (
                <Radar
                  key={cs.name}
                  name={cs.name}
                  dataKey={cs.name}
                  fill={COLORS[(i + 1) % COLORS.length].fill}
                  stroke={COLORS[(i + 1) % COLORS.length].stroke}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{ r: 2, fill: COLORS[(i + 1) % COLORS.length].stroke, fillOpacity: 1 }}
                />
              ))}
              {comparisonScores.length > 0 && (
                <Legend
                  wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/[0.04]">
          {scores.map((s) => (
            <div key={s.dimension} className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500/60"
                  style={{ width: `${s.score}%` }}
                />
              </div>
              <span className="text-[10px] text-white/30 truncate">{s.dimension}</span>
              <span className="text-[10px] text-white/50 font-semibold">{s.score}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
