import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { reportsToTimelineData } from '@/utils/chartHelpers'
import { SectionHeader } from './SectionHeader'

interface ResearchTimelineProps {
  domain: string
  reports: Array<{
    researchedAt: string
    confidence?: number
    riskLevel?: string
    painPointCount?: number
    jobCount?: number
  }>
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; payload: { label: string } }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs font-semibold text-white/60 mb-2">{data.label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-white/45">{entry.name}:</span>
          <span className="text-white/80 font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ResearchTimeline({ domain, reports }: ResearchTimelineProps) {
  const data = useMemo(() => reportsToTimelineData(reports), [reports])

  if (data.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <SectionHeader icon={Clock} title="Research Timeline" accent="text-cyan-400" />
        <div className="glass p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-sm text-white/30 mb-1">No historical data yet</p>
            <p className="text-xs text-white/20">
              Research <span className="text-white/35 font-medium">{domain}</span> again to track changes over time
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <SectionHeader icon={Clock} title="Research Timeline" accent="text-cyan-400" />
      <div className="glass p-6">
        <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-4">
          {data.length} research runs for {domain}
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Line
                type="monotone"
                dataKey="confidence"
                name="Confidence"
                stroke="#5c7cfa"
                strokeWidth={2}
                dot={{ r: 4, fill: '#5c7cfa', strokeWidth: 2, stroke: '#1a1a2e' }}
                activeDot={{ r: 6, fill: '#7c9aff', stroke: '#5c7cfa', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="riskLevel"
                name="Risk Level"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#f87171', strokeWidth: 2, stroke: '#1a1a2e' }}
                activeDot={{ r: 5, fill: '#fca5a5', stroke: '#f87171', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded-full bg-[#5c7cfa]" />
            <span className="text-[10px] text-white/35 font-medium">Confidence Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded-full bg-[#f87171] opacity-60" style={{ borderTop: '1px dashed #f87171' }} />
            <span className="text-[10px] text-white/35 font-medium">Risk Level</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
