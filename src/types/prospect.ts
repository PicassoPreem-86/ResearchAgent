export type EmailTone = 'casual' | 'formal' | 'provocative' | 'consultative'

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
}

export interface ICP {
  industries: string[]
  sizeRange: string
  techStack: string[]
  keywords: string[]
  geography: string
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
  recruitingAngle: string
}

export interface TalentSearch {
  targetRole: string
  targetSkills: string[]
  companyDomain: string
}

export interface TeamComposition {
  departments: { name: string; count: number }[]
  seniorityBreakdown: string
  teamCulture: string
}

export interface TalentReport {
  company: { name: string; domain: string }
  targetRole: string
  profiles: TalentProfile[]
  talentInsights: TalentInsight[]
  recruitingEmail: OutreachEmail
  personalizedOutreach: { name: string; email: OutreachEmail }[]
  teamComposition: TeamComposition
  generatedAt: string
}

export interface TalentInsight {
  title: string
  description: string
  signal: 'positive' | 'negative' | 'neutral'
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
