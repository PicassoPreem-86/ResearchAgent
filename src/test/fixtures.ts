import type { ProspectReport } from '../types/prospect.js'
import type { ScrapedCompanyData } from '../server/scraper.js'

export const SAMPLE_SCRAPED_DATA: ScrapedCompanyData = {
  homepage: {
    url: 'https://stripe.com',
    title: 'Stripe | Financial Infrastructure for the Internet',
    text: 'Stripe is a financial infrastructure platform for businesses. Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.',
    links: ['/about', '/careers', '/pricing', '/blog'],
    meta: {
      description: 'Online payment processing for internet businesses.',
      'og:title': 'Stripe',
    },
  },
  about: {
    url: 'https://stripe.com/about',
    title: 'About Stripe',
    text: 'Stripe builds the most powerful and flexible tools for internet commerce.',
    links: [],
    meta: {},
  },
  careers: {
    url: 'https://stripe.com/careers',
    title: 'Careers at Stripe',
    text: 'Join our team. We are hiring engineers, designers, and more.',
    links: [],
    meta: {},
  },
  pricing: null,
  blog: null,
  jobListings: ['Senior Backend Engineer', 'Product Designer', 'Data Scientist'],
  newsItems: [],
  detectedTech: ['React', 'Next.js'],
  teamMembers: [{ name: 'Patrick Collison', role: 'CEO' }],
  structuredData: [],
  rawTexts: 'Stripe is a financial infrastructure platform for businesses.',
}

export const SAMPLE_REPORT: ProspectReport = {
  company: {
    name: 'Stripe',
    domain: 'stripe.com',
    description: 'Financial infrastructure platform for businesses.',
    industry: 'Fintech / Payments',
    estimatedSize: '500+',
    techStack: ['React', 'Ruby', 'Go'],
    recentNews: ['Raised Series I at $50B valuation'],
    keyProducts: ['Stripe Payments', 'Stripe Atlas', 'Stripe Connect'],
    confidence: 90,
  },
  executiveSummary: 'Stripe is a dominant payments infrastructure company.',
  painPoints: [
    {
      title: 'Scaling infrastructure',
      description: 'Rapid growth strains backend systems.',
      evidence: 'Multiple SRE job openings indicate scaling challenges.',
      severity: 'high',
      confidence: 85,
    },
  ],
  jobInsights: [
    {
      title: 'Senior Backend Engineer',
      department: 'Engineering',
      inference: 'Investing heavily in core platform development.',
    },
  ],
  email: {
    subject: 'Quick question about Stripe payments',
    body: 'Hi Patrick, noticed you are scaling your team...',
    personalizationNotes: ['Referenced hiring patterns'],
    tone: 'casual',
    variant: 'direct-value',
  },
  emails: [
    {
      subject: 'Quick question about Stripe payments',
      body: 'Hi Patrick, noticed you are scaling your team...',
      personalizationNotes: ['Referenced hiring patterns'],
      tone: 'casual',
      variant: 'direct-value',
    },
  ],
  swot: {
    strengths: [{ title: 'Market leader', description: 'Dominant position in online payments.', evidence: 'Used by millions of businesses.' }],
    weaknesses: [{ title: 'Enterprise complexity', description: 'Moving upmarket creates complexity.', evidence: 'Hiring enterprise sales reps.' }],
    opportunities: [{ title: 'Global expansion', description: 'Many markets still underserved.', evidence: 'Recent launches in new countries.' }],
    threats: [{ title: 'Regulatory risk', description: 'Financial regulations evolving rapidly.', evidence: 'Multiple compliance-related job posts.' }],
  },
  marketPosition: {
    segment: 'Payment Infrastructure',
    pricingTier: 'premium',
    targetAudience: 'Internet businesses of all sizes',
    differentiators: ['Developer-first APIs', 'Global coverage'],
    marketMaturity: 'growing',
  },
  risks: {
    level: 'medium',
    flags: [{ title: 'Regulatory changes', description: 'New payment regulations could impact operations.', severity: 'medium' }],
  },
  keyPeople: [{ name: 'Patrick Collison', role: 'CEO', context: 'Co-founded Stripe with brother John.' }],
  financialSignals: {
    fundingStage: 'growth',
    estimatedRevenue: '$10B+',
    growthIndicators: ['Rapid hiring', 'Product expansion'],
    hiringVelocity: 'High — 100+ open positions',
  },
  competitiveLandscape: {
    competitors: [{ name: 'Adyen', domain: 'adyen.com', positioning: 'Enterprise-focused payments' }],
    moat: 'Developer ecosystem and brand loyalty.',
    vulnerabilities: ['Price competition from newer entrants'],
  },
  strategicRecommendations: ['Expand embedded finance offerings'],
  template: 'general',
  researchedAt: '2025-01-01T00:00:00.000Z',
}

export const SAMPLE_OPENAI_RESPONSE = JSON.stringify({
  executiveSummary: SAMPLE_REPORT.executiveSummary,
  company: SAMPLE_REPORT.company,
  painPoints: SAMPLE_REPORT.painPoints,
  jobInsights: SAMPLE_REPORT.jobInsights,
  swot: SAMPLE_REPORT.swot,
  marketPosition: SAMPLE_REPORT.marketPosition,
  risks: SAMPLE_REPORT.risks,
  keyPeople: SAMPLE_REPORT.keyPeople,
  financialSignals: SAMPLE_REPORT.financialSignals,
  competitiveLandscape: SAMPLE_REPORT.competitiveLandscape,
  strategicRecommendations: SAMPLE_REPORT.strategicRecommendations,
  emails: SAMPLE_REPORT.emails,
})

export const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Stripe | Financial Infrastructure</title>
  <meta name="description" content="Online payment processing">
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <h1>Stripe</h1>
  <p>Financial infrastructure for the internet.</p>
  <a href="/about">About</a>
  <a href="/careers">Careers</a>
  <a href="/pricing">Pricing</a>
</body>
</html>
`
