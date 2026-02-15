import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { Map } from 'lucide-react'
import type { CompetitiveLandscape as CompetitiveLandscapeType, MarketPosition } from '@/types/prospect'
import { competitorsToMapData, type CompetitorMapPoint } from '@/utils/chartHelpers'
import { SectionHeader } from './SectionHeader'

interface CompetitiveLandscapeMapProps {
  company: { name: string; domain?: string }
  landscape: CompetitiveLandscapeType
  marketPosition?: MarketPosition
}

const TARGET_COLOR = '#5c7cfa'
const COMPETITOR_COLOR = '#64748b'
const TARGET_HOVER = '#7c9aff'
const COMPETITOR_HOVER = '#94a3b8'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: CompetitorMapPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl max-w-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.isTarget ? TARGET_COLOR : COMPETITOR_COLOR }}
        />
        <span className="text-sm font-semibold text-white/90">{data.name}</span>
        {data.isTarget && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-300/80 font-semibold uppercase tracking-wider">
            Target
          </span>
        )}
      </div>
      <p className="text-xs text-white/45 leading-relaxed">{data.description}</p>
    </div>
  )
}

export function CompetitiveLandscapeMap({ company, landscape, marketPosition }: CompetitiveLandscapeMapProps) {
  const data = useMemo(
    () => competitorsToMapData(company, landscape.competitors, marketPosition),
    [company, landscape.competitors, marketPosition]
  )

  if (data.length < 2) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <SectionHeader icon={Map} title="Competitive Positioning Map" accent="text-blue-400" />
      <div className="glass p-6">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Market Maturity"
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                ticks={[20, 50, 75, 90]}
                tickFormatter={(v: number) => {
                  if (v <= 20) return 'Early'
                  if (v <= 50) return 'Growth'
                  if (v <= 75) return 'Mature'
                  return 'Enterprise'
                }}
                label={{
                  value: 'Market Maturity',
                  position: 'bottom',
                  offset: 10,
                  style: { fill: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Market Strength"
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                ticks={[25, 50, 75]}
                tickFormatter={(v: number) => {
                  if (v <= 25) return 'Niche'
                  if (v <= 50) return 'Growing'
                  return 'Leader'
                }}
                label={{
                  value: 'Market Strength',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  style: { fill: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Scatter data={data} shape="circle">
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isTarget ? TARGET_COLOR : COMPETITOR_COLOR}
                    fillOpacity={entry.isTarget ? 0.9 : 0.5}
                    stroke={entry.isTarget ? TARGET_HOVER : COMPETITOR_HOVER}
                    strokeWidth={entry.isTarget ? 2 : 1}
                    r={entry.isTarget ? 10 : 6}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TARGET_COLOR }} />
            <span className="text-[10px] text-white/35 font-medium">{company.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPETITOR_COLOR, opacity: 0.5 }} />
            <span className="text-[10px] text-white/35 font-medium">Competitors</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
