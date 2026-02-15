import type { ProspectReport } from '../types/prospect'

export interface RadarScore {
  dimension: string
  score: number
  fullMark: 100
}

export interface CompetitorMapPoint {
  name: string
  x: number
  y: number
  size: number
  isTarget: boolean
  description: string
}

export interface TimelinePoint {
  date: string
  confidence: number
  riskLevel: number
  painPointCount: number
  jobCount: number
  label: string
}

const MATURITY_SCORES: Record<string, number> = {
  early: 20,
  growing: 50,
  mature: 75,
  declining: 90,
}

const FUNDING_SCORES: Record<string, number> = {
  'pre-seed': 15,
  seed: 25,
  'series a': 40,
  'series b': 55,
  'series c': 65,
  'series d': 75,
  growth: 80,
  'late stage': 85,
  ipo: 95,
  public: 95,
  bootstrapped: 30,
}

const RISK_LEVEL_SCORES: Record<string, number> = {
  low: 25,
  medium: 50,
  high: 75,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function calculateProductMaturity(report: ProspectReport): number {
  let score = 40
  const maturity = report.marketPosition?.marketMaturity
  if (maturity && MATURITY_SCORES[maturity] !== undefined) {
    score = MATURITY_SCORES[maturity]
  }
  const diffCount = report.marketPosition?.differentiators?.length || 0
  score += Math.min(20, diffCount * 5)
  const productCount = report.company?.keyProducts?.length || 0
  score += Math.min(15, productCount * 5)
  if (report.marketPosition?.pricingTier === 'premium' || report.marketPosition?.pricingTier === 'enterprise') {
    score += 10
  }
  return clamp(Math.round(score), 0, 100)
}

export function calculateMarketPresence(report: ProspectReport): number {
  let score = 30
  const competitors = report.competitiveLandscape?.competitors?.length || 0
  score += Math.min(25, competitors * 5)
  if (report.competitiveLandscape?.moat) score += 15
  if (report.marketPosition?.segment) score += 10
  if (report.marketPosition?.targetAudience) score += 5
  const newsCount = report.company?.recentNews?.length || 0
  score += Math.min(15, newsCount * 5)
  return clamp(Math.round(score), 0, 100)
}

export function calculateTeamStrength(report: ProspectReport): number {
  let score = 25
  const people = report.keyPeople?.length || 0
  score += Math.min(35, people * 7)
  const cSuite = report.keyPeople?.filter(p =>
    /ceo|cto|cfo|coo|cmo|founder|co-founder|president|vp/i.test(p.role)
  ).length || 0
  score += Math.min(25, cSuite * 10)
  if (report.company?.estimatedSize) {
    const sizeStr = report.company.estimatedSize.toLowerCase()
    if (/1000|\dk|10,000/.test(sizeStr)) score += 15
    else if (/500|hundred/.test(sizeStr)) score += 10
    else if (/100|50/.test(sizeStr)) score += 5
  }
  return clamp(Math.round(score), 0, 100)
}

export function calculateFinancialHealth(report: ProspectReport): number {
  let score = 30
  const fs = report.financialSignals
  if (!fs) return score
  const stage = (fs.fundingStage || '').toLowerCase()
  for (const [key, val] of Object.entries(FUNDING_SCORES)) {
    if (stage.includes(key)) {
      score = val
      break
    }
  }
  if (fs.estimatedRevenue) {
    const rev = fs.estimatedRevenue.toLowerCase()
    if (rev.includes('b') || rev.includes('billion')) score += 20
    else if (rev.includes('m') || rev.includes('million')) score += 10
  }
  const growthCount = fs.growthIndicators?.length || 0
  score += Math.min(15, growthCount * 5)
  return clamp(Math.round(score), 0, 100)
}

export function calculateGrowthVelocity(report: ProspectReport): number {
  let score = 25
  const fs = report.financialSignals
  if (fs?.hiringVelocity) {
    const hv = fs.hiringVelocity.toLowerCase()
    if (hv.includes('high') || hv.includes('rapid') || hv.includes('aggressive')) score += 30
    else if (hv.includes('moderate') || hv.includes('steady')) score += 15
    else if (hv.includes('low') || hv.includes('slow')) score += 5
    const numMatch = hv.match(/(\d+)\+?\s*(open|position|role|job)/i)
    if (numMatch) {
      const count = parseInt(numMatch[1])
      score += Math.min(20, Math.floor(count / 10) * 5)
    }
  }
  const jobCount = report.jobInsights?.length || 0
  score += Math.min(15, jobCount * 3)
  const growthIndicators = report.financialSignals?.growthIndicators?.length || 0
  score += Math.min(10, growthIndicators * 3)
  return clamp(Math.round(score), 0, 100)
}

export function calculateInnovation(report: ProspectReport): number {
  let score = 30
  const techCount = report.company?.techStack?.length || 0
  score += Math.min(25, techCount * 4)
  const diffCount = report.marketPosition?.differentiators?.length || 0
  score += Math.min(20, diffCount * 5)
  const productCount = report.company?.keyProducts?.length || 0
  score += Math.min(15, productCount * 5)
  if (report.swot?.opportunities?.length) {
    score += Math.min(10, report.swot.opportunities.length * 3)
  }
  return clamp(Math.round(score), 0, 100)
}

export function reportToRadarScores(report: ProspectReport): RadarScore[] {
  return [
    { dimension: 'Product Maturity', score: calculateProductMaturity(report), fullMark: 100 },
    { dimension: 'Market Presence', score: calculateMarketPresence(report), fullMark: 100 },
    { dimension: 'Team Strength', score: calculateTeamStrength(report), fullMark: 100 },
    { dimension: 'Financial Health', score: calculateFinancialHealth(report), fullMark: 100 },
    { dimension: 'Growth Velocity', score: calculateGrowthVelocity(report), fullMark: 100 },
    { dimension: 'Innovation', score: calculateInnovation(report), fullMark: 100 },
  ]
}

export function competitorsToMapData(
  company: { name: string; domain?: string },
  competitors: Array<{ name: string; domain?: string; positioning: string }>,
  marketPosition?: { segment?: string; pricingTier?: string; marketMaturity?: string }
): CompetitorMapPoint[] {
  const points: CompetitorMapPoint[] = []

  const targetMaturity = MATURITY_SCORES[marketPosition?.marketMaturity || ''] ?? 50
  const targetStrength = estimateStrengthFromDescription(marketPosition?.segment || '', true)
  points.push({
    name: company.name,
    x: targetMaturity,
    y: targetStrength,
    size: 200,
    isTarget: true,
    description: marketPosition?.segment || 'Target company',
  })

  competitors.forEach((comp, i) => {
    const x = estimateMaturityFromDescription(comp.positioning)
    const y = estimateStrengthFromDescription(comp.positioning, false)
    const jitterX = ((i % 3) - 1) * 5
    const jitterY = ((i % 5) - 2) * 3
    points.push({
      name: comp.name,
      x: clamp(x + jitterX, 5, 95),
      y: clamp(y + jitterY, 5, 95),
      size: 120,
      isTarget: false,
      description: comp.positioning,
    })
  })

  return points
}

function estimateMaturityFromDescription(desc: string): number {
  const lower = desc.toLowerCase()
  if (/startup|early|new|emerging|nascent/.test(lower)) return 20
  if (/growing|scaling|expanding|series/.test(lower)) return 45
  if (/established|mature|dominant|leader|enterprise/.test(lower)) return 75
  if (/legacy|declining|traditional/.test(lower)) return 90
  return 50
}

function estimateStrengthFromDescription(desc: string, isTarget: boolean): number {
  const lower = desc.toLowerCase()
  let score = isTarget ? 70 : 50
  if (/leader|dominant|top|best|largest|major/.test(lower)) score += 20
  if (/strong|powerful|significant|comprehensive/.test(lower)) score += 10
  if (/niche|small|limited|narrow|focused/.test(lower)) score -= 15
  if (/enterprise|premium|global/.test(lower)) score += 10
  return clamp(score, 10, 95)
}

export function reportsToTimelineData(
  reports: Array<{
    researchedAt: string
    confidence?: number
    riskLevel?: string
    painPointCount?: number
    jobCount?: number
  }>
): TimelinePoint[] {
  return reports
    .sort((a, b) => new Date(a.researchedAt).getTime() - new Date(b.researchedAt).getTime())
    .map((r) => ({
      date: new Date(r.researchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      confidence: r.confidence ?? 0,
      riskLevel: RISK_LEVEL_SCORES[r.riskLevel || ''] ?? 0,
      painPointCount: r.painPointCount ?? 0,
      jobCount: r.jobCount ?? 0,
      label: new Date(r.researchedAt).toLocaleString(),
    }))
}
