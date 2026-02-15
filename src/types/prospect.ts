export type EmailTone = 'casual' | 'formal' | 'provocative' | 'consultative'

export type ClaimConfidence = 'high' | 'medium' | 'low' | 'inferred'

export interface SourcedClaim {
  claim: string
  source: string
  extractedAt: string
  confidence: ClaimConfidence
}

export interface DataFreshness {
  oldestSource: string
  newestSource: string
  sources: Array<{
    url: string
    fetchedAt: string
    category: string
    charCount: number
  }>
  totalPagesFetched: number
  totalPagesSuccessful: number
}

export interface SectionConfidence {
  section: string
  score: number
  reasoning: string
  claimCount: number
  sourcedClaimCount: number
}

export type ReportTemplate = 'investor-dd' | 'competitive-analysis' | 'partnership-eval' | 'sales-research' | 'general'

export interface SwotAnalysis {
  strengths: SwotItem[]
  weaknesses: SwotItem[]
  opportunities: SwotItem[]
  threats: SwotItem[]
}

export interface SwotItem {
  title: string
  description: string
  evidence: string
}

export interface MarketPosition {
  segment: string
  pricingTier: string
  targetAudience: string
  differentiators: string[]
  marketMaturity: 'early' | 'growing' | 'mature' | 'declining'
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high'
  flags: RiskFlag[]
}

export interface RiskFlag {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface KeyPerson {
  name: string
  role: string
  context: string
}

export interface FinancialSignals {
  fundingStage: string
  estimatedRevenue: string
  growthIndicators: string[]
  hiringVelocity: string
}

export interface ComparisonReport {
  companies: ProspectReport[]
  comparison: ComparisonMatrix
  generatedAt: string
}

export interface ComparisonMatrix {
  dimensions: ComparisonDimension[]
  summary: string
  recommendation: string
  overallWinner?: string
  companySummaries: { domain: string; strengths: string[]; weaknesses: string[] }[]
}

export interface ComparisonDimension {
  name: string
  entries: { domain: string; value: string; score?: number }[]
  winner?: string
}

export interface CompanyBrief {
  name: string
  domain: string
  description: string
  industry: string
  estimatedSize: string
  techStack: string[]
  recentNews: string[]
  keyProducts: string[]
  confidence: number
}

export interface PainPoint {
  title: string
  description: string
  evidence: string
  severity: 'high' | 'medium' | 'low'
  confidence: number
}

export interface JobInsight {
  title: string
  department: string
  inference: string
}

export interface OutreachEmail {
  subject: string
  body: string
  personalizationNotes: string[]
  tone: EmailTone
  variant: string
}

export interface SellerContext {
  product?: string
  valueProposition?: string
}

export interface CompetitiveLandscape {
  competitors: { name: string; domain?: string; positioning: string }[]
  moat: string
  vulnerabilities: string[]
}

export interface ProspectReport {
  company: CompanyBrief
  executiveSummary: string
  painPoints: PainPoint[]
  jobInsights: JobInsight[]
  email: OutreachEmail
  emails: OutreachEmail[]
  swot: SwotAnalysis
  marketPosition: MarketPosition
  risks: RiskAssessment
  keyPeople: KeyPerson[]
  financialSignals: FinancialSignals
  competitiveLandscape: CompetitiveLandscape
  strategicRecommendations: string[]
  template: ReportTemplate
  researchedAt: string
  sourceMap: Record<string, SourcedClaim[]>
  dataFreshness: DataFreshness
  sectionConfidence: SectionConfidence[]
}

export interface GeoTarget {
  regions: string[]
  countries: string[]
  metros: string[]
}

export const EMPTY_GEO_TARGET: GeoTarget = { regions: [], countries: [], metros: [] }

export function hasGeoSelections(geo: GeoTarget): boolean {
  return geo.regions.length > 0 || geo.countries.length > 0 || geo.metros.length > 0
}

export function geoTargetToQueryString(geo: GeoTarget): string {
  const terms = [...geo.metros, ...geo.countries, ...geo.regions]
  if (terms.length === 0) return ''
  if (terms.length === 1) return `"${terms[0]}"`
  return terms.map((t) => `"${t}"`).join(' OR ')
}

export function geoTargetToLabel(geo: GeoTarget): string {
  const terms = [...geo.metros, ...geo.countries, ...geo.regions]
  return terms.join(', ')
}

export function migrateGeography(geography: string | GeoTarget | undefined): GeoTarget {
  if (!geography) return { ...EMPTY_GEO_TARGET }
  if (typeof geography === 'object' && 'regions' in geography) {
    return {
      regions: geography.regions || [],
      countries: geography.countries || [],
      metros: geography.metros || [],
    }
  }
  return { ...EMPTY_GEO_TARGET }
}

export interface ICP {
  industries: string[]
  sizeRange: string
  techStack: string[]
  keywords: string[]
  geography: GeoTarget
  fundingStage: string
}

export interface DiscoveredCompany {
  domain: string
  name: string
  snippet: string
  source: string
  matchScore: number
  matchReasons: string[]
  description?: string
  industry?: string
  estimatedSize?: string
  keyProducts?: string[]
  whyRelevant?: string
}

export interface DiscoverResults {
  query: string
  icp?: ICP
  referenceDomain?: string
  companies: DiscoveredCompany[]
  generatedAt: string
}

export interface TalentProfile {
  name: string
  role: string
  department: string
  skills: string[]
  linkedinUrl?: string
  githubUrl?: string
  matchScore: number
  matchReasons: string[]
  fitSummary: string
  source?: string
  currentCompany?: string
}

export interface TalentSearch {
  targetRole: string
  targetSkills: string[]
  location?: GeoTarget
  seniority?: string
}

export interface TalentReport {
  search: { role: string; skills: string[]; location?: GeoTarget; seniority?: string }
  targetRole: string
  profiles: TalentProfile[]
  recruitingEmail: OutreachEmail
  personalizedOutreach: { name: string; email: OutreachEmail }[]
  generatedAt: string
}

export type ResearchStage =
  | 'idle'
  | 'scraping'
  | 'analyzing'
  | 'jobs'
  | 'generating'
  | 'complete'
  | 'error'

export interface ResearchProgress {
  stage: ResearchStage
  message: string
  progress: number
}
