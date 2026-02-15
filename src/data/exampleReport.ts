import type { ProspectReport } from '@/types/prospect'

export const EXAMPLE_REPORT: ProspectReport = {
  company: {
    name: 'Stripe',
    domain: 'stripe.com',
    description:
      'Stripe is a global financial infrastructure platform that enables businesses of all sizes to accept payments, manage revenue, and accelerate growth. Their suite of APIs and tools powers online commerce for millions of companies worldwide.',
    industry: 'Financial Technology',
    estimatedSize: '8,000+ employees',
    techStack: ['Ruby', 'JavaScript', 'React', 'Go', 'Scala', 'AWS', 'GraphQL', 'Terraform'],
    recentNews: [
      'Expanded Stripe Connect with new marketplace features',
      'Launched AI-powered fraud detection improvements to Radar',
      'New revenue recognition automation for enterprise customers',
    ],
    keyProducts: ['Stripe Payments', 'Stripe Connect', 'Stripe Billing', 'Stripe Atlas', 'Stripe Radar', 'Stripe Treasury'],
    confidence: 92,
  },
  executiveSummary:
    'Stripe dominates online payment processing for internet businesses, with a developer-first approach that has made it the default choice for startups and increasingly for enterprise. Their expansion into banking-as-a-service (Treasury), revenue automation (Revenue Recognition), and identity verification signals a strategic move toward becoming a full financial operating system. Key risks include increasing competition from Adyen in enterprise and regulatory complexity in global markets.',
  painPoints: [
    {
      title: 'Enterprise sales cycle complexity',
      description: 'Large enterprises require extensive compliance documentation and custom integration support that strains their self-serve model.',
      evidence: 'Multiple enterprise-focused job postings for solutions architects and compliance specialists.',
      severity: 'medium',
      confidence: 78,
    },
    {
      title: 'International regulatory burden',
      description: 'Operating across 46+ countries requires navigating diverse regulatory frameworks, increasing operational overhead.',
      evidence: 'Significant legal and compliance team expansion noted across EU, APAC, and LATAM regions.',
      severity: 'high',
      confidence: 85,
    },
    {
      title: 'Developer experience maintenance at scale',
      description: 'Keeping API surface clean and documentation best-in-class becomes harder as product suite expands.',
      evidence: 'Developer community feedback on increasing complexity of integration paths.',
      severity: 'medium',
      confidence: 72,
    },
  ],
  jobInsights: [
    {
      title: 'Staff Machine Learning Engineer',
      department: 'AI / ML',
      inference: 'Investing heavily in AI-powered fraud detection and risk scoring, likely expanding Radar capabilities.',
    },
    {
      title: 'Senior Product Manager — Banking as a Service',
      department: 'Product',
      inference: 'Doubling down on Treasury and embedded finance, signaling BaaS as a major growth vector.',
    },
    {
      title: 'Enterprise Solutions Architect',
      department: 'Sales Engineering',
      inference: 'Moving upmarket aggressively — needs custom integration support for large-scale deployments.',
    },
  ],
  email: {
    subject: 'Quick thought on Stripe\'s enterprise scaling challenge',
    body: 'Hi there,\n\nI\'ve been following Stripe\'s expansion into enterprise — impressive trajectory. I noticed you\'re scaling solutions architecture and compliance teams, which tells me the self-serve model is evolving.\n\nWe help companies like Stripe reduce integration complexity for enterprise customers without adding headcount. Would love to share how.\n\nWorth a 15-minute chat?',
    personalizationNotes: [
      'References their hiring signals for enterprise roles',
      'Speaks to the self-serve to enterprise transition',
      'Keeps it short and actionable',
    ],
    tone: 'casual',
    variant: 'main',
  },
  emails: [
    {
      subject: 'Quick thought on Stripe\'s enterprise scaling challenge',
      body: 'Hi there,\n\nI\'ve been following Stripe\'s expansion into enterprise — impressive trajectory. I noticed you\'re scaling solutions architecture and compliance teams, which tells me the self-serve model is evolving.\n\nWe help companies like Stripe reduce integration complexity for enterprise customers without adding headcount. Would love to share how.\n\nWorth a 15-minute chat?',
      personalizationNotes: [
        'References their hiring signals for enterprise roles',
        'Speaks to the self-serve to enterprise transition',
      ],
      tone: 'casual',
      variant: 'Casual',
    },
    {
      subject: 'Enterprise Integration Complexity at Scale — A Proposal',
      body: 'Dear Stripe Team,\n\nAs Stripe continues its impressive expansion into enterprise financial services, the complexity of supporting custom integrations at scale presents both a challenge and an opportunity.\n\nOur platform helps high-growth fintech companies streamline enterprise onboarding workflows, reducing time-to-integration by up to 60%. I would welcome the opportunity to discuss how this could support your growth trajectory.\n\nWould you be available for a brief call this week?',
      personalizationNotes: [
        'Formal tone suited for enterprise decision-makers',
        'Quantified value proposition',
      ],
      tone: 'formal',
      variant: 'Formal',
    },
    {
      subject: 'Stripe\'s biggest bottleneck isn\'t payments',
      body: 'Hi,\n\nStripe has effectively won the payments war for internet companies. But here\'s the thing — your next frontier (enterprise) is a completely different game. Custom integrations, compliance requirements, 6-month sales cycles.\n\nThe companies that figure out how to scale enterprise without losing their developer-first DNA win big. We\'ve helped 3 similar companies do exactly that.\n\nCurious?',
      personalizationNotes: [
        'Provocative opening challenges assumptions',
        'Acknowledges their dominance before introducing the gap',
      ],
      tone: 'provocative',
      variant: 'Provocative',
    },
  ],
  swot: {
    strengths: [
      {
        title: 'Developer-first brand',
        description: 'Best-in-class documentation and API design make Stripe the default choice for technical teams.',
        evidence: 'Consistently ranked #1 in developer satisfaction surveys for payment APIs.',
      },
      {
        title: 'Full-stack financial platform',
        description: 'From payments to banking (Treasury) to corporate cards, offers a complete financial OS.',
        evidence: 'Revenue diversification beyond payments into billing, connect, and treasury products.',
      },
      {
        title: 'Network effects',
        description: 'The more businesses use Stripe, the better their fraud models and the easier marketplace integrations become.',
        evidence: 'Stripe Connect processes billions in marketplace volume, creating strong lock-in.',
      },
    ],
    weaknesses: [
      {
        title: 'Enterprise sales maturity',
        description: 'Self-serve DNA makes complex enterprise deals slower than pure enterprise competitors like Adyen.',
        evidence: 'Still building out dedicated enterprise sales org with recent senior hires.',
      },
      {
        title: 'Pricing pressure',
        description: 'Standard 2.9% + 30¢ pricing faces pressure as competitors offer volume discounts.',
        evidence: 'Enterprise customers frequently negotiate custom rates.',
      },
    ],
    opportunities: [
      {
        title: 'Banking-as-a-Service expansion',
        description: 'Stripe Treasury and Issuing can embed financial services directly into any platform.',
        evidence: 'Treasury product seeing rapid adoption among platform businesses.',
      },
      {
        title: 'AI-powered financial automation',
        description: 'Revenue recognition, fraud detection, and invoicing can all be enhanced with ML/AI.',
        evidence: 'Heavy AI/ML hiring and Radar product improvements.',
      },
    ],
    threats: [
      {
        title: 'Adyen enterprise competition',
        description: 'Adyen is winning large enterprise deals with a single-platform approach.',
        evidence: 'Multiple Fortune 500 companies migrating to Adyen for unified global payments.',
      },
      {
        title: 'Regulatory fragmentation',
        description: 'Operating as a regulated entity in 46+ countries creates compliance complexity and risk.',
        evidence: 'Increasing regulatory scrutiny of fintech companies globally.',
      },
    ],
  },
  marketPosition: {
    segment: 'Payment Infrastructure / Financial Technology',
    pricingTier: 'Mid-market to Enterprise',
    targetAudience: 'Internet businesses, SaaS companies, marketplaces, and platform businesses',
    differentiators: ['Developer experience', 'API-first design', 'Full financial stack', 'Global reach'],
    marketMaturity: 'growing',
  },
  risks: {
    level: 'medium',
    flags: [
      {
        title: 'Regulatory exposure across 46+ markets',
        description: 'Each market has unique financial regulations that could impact operations.',
        severity: 'high',
      },
      {
        title: 'Valuation pressure',
        description: 'Last valued at $50B+ with pressure to demonstrate enterprise-grade revenue growth.',
        severity: 'medium',
      },
    ],
  },
  keyPeople: [
    { name: 'Patrick Collison', role: 'CEO & Co-founder', context: 'Drives product vision and long-term strategy' },
    { name: 'John Collison', role: 'President & Co-founder', context: 'Oversees business operations and growth' },
    { name: 'David Singleton', role: 'CTO', context: 'Leads engineering and technical infrastructure' },
  ],
  financialSignals: {
    fundingStage: 'Late-stage Private (Series I)',
    estimatedRevenue: '$14B+ annual revenue',
    growthIndicators: ['Processing volume growing 25%+ YoY', 'Enterprise segment fastest-growing', 'International expansion accelerating'],
    hiringVelocity: 'Moderate — targeted hiring in AI/ML, enterprise sales, and compliance',
  },
  competitiveLandscape: {
    competitors: [
      { name: 'Adyen', domain: 'adyen.com', positioning: 'Enterprise-first unified commerce platform, strong in physical + online payments' },
      { name: 'PayPal / Braintree', domain: 'paypal.com', positioning: 'Consumer brand with developer tools, strongest in consumer-facing checkout' },
      { name: 'Square (Block)', domain: 'squareup.com', positioning: 'SMB-focused with growing online presence, strong POS integration' },
    ],
    moat: 'Developer brand loyalty, API quality, and expanding financial services platform create high switching costs.',
    vulnerabilities: [
      'Enterprise deals still require significant custom work',
      'Pricing transparency can be a disadvantage at high volume',
      'Dependent on continued developer community trust',
    ],
  },
  strategicRecommendations: [
    'Time outreach around their enterprise expansion — they need tools that help scale without losing agility.',
    'Position any offering as developer-friendly and API-native to align with their culture.',
    'Focus on compliance automation as a wedge — regulatory burden is their fastest-growing pain point.',
    'Engage through technical content and developer communities rather than traditional sales outreach.',
  ],
  template: 'general',
  researchedAt: new Date().toISOString(),
  sourceMap: {
    painPoints: [
      { claim: 'Enterprise sales complexity from job postings', source: 'careers', extractedAt: new Date().toISOString(), confidence: 'high' },
      { claim: 'Regulatory expansion across 46+ countries', source: 'about', extractedAt: new Date().toISOString(), confidence: 'high' },
      { claim: 'Developer experience complexity at scale', source: 'homepage', extractedAt: new Date().toISOString(), confidence: 'medium' },
    ],
    financialSignals: [
      { claim: 'Series I funding at $50B valuation', source: 'news', extractedAt: new Date().toISOString(), confidence: 'high' },
      { claim: '$14B+ annual revenue estimate', source: 'inferred', extractedAt: new Date().toISOString(), confidence: 'medium' },
    ],
    competitiveLandscape: [
      { claim: 'Adyen competing in enterprise space', source: 'inferred', extractedAt: new Date().toISOString(), confidence: 'medium' },
    ],
    marketPosition: [
      { claim: 'Developer-first API positioning', source: 'homepage', extractedAt: new Date().toISOString(), confidence: 'high' },
    ],
    risks: [
      { claim: 'Regulatory exposure in 46+ markets', source: 'about', extractedAt: new Date().toISOString(), confidence: 'high' },
    ],
    keyPeople: [
      { claim: 'Patrick Collison is CEO', source: 'about', extractedAt: new Date().toISOString(), confidence: 'high' },
      { claim: 'John Collison is President', source: 'about', extractedAt: new Date().toISOString(), confidence: 'high' },
    ],
  },
  dataFreshness: {
    oldestSource: new Date().toISOString(),
    newestSource: new Date().toISOString(),
    sources: [
      { url: 'https://stripe.com', fetchedAt: new Date().toISOString(), category: 'homepage', charCount: 5000 },
      { url: 'https://stripe.com/about', fetchedAt: new Date().toISOString(), category: 'about', charCount: 3000 },
      { url: 'https://stripe.com/careers', fetchedAt: new Date().toISOString(), category: 'careers', charCount: 4000 },
    ],
    totalPagesFetched: 5,
    totalPagesSuccessful: 3,
  },
  sectionConfidence: [
    { section: 'painPoints', score: 100, reasoning: '3/3 pain points backed by direct evidence', claimCount: 3, sourcedClaimCount: 3 },
    { section: 'financialSignals', score: 50, reasoning: '1/2 financial signals backed by direct evidence', claimCount: 2, sourcedClaimCount: 1 },
    { section: 'competitiveLandscape', score: 100, reasoning: '1/1 competitive insights backed by direct evidence', claimCount: 1, sourcedClaimCount: 1 },
    { section: 'marketPosition', score: 100, reasoning: '1/1 market position claims backed by direct evidence', claimCount: 1, sourcedClaimCount: 1 },
    { section: 'risks', score: 100, reasoning: '1/1 risk signals backed by direct evidence', claimCount: 1, sourcedClaimCount: 1 },
    { section: 'keyPeople', score: 100, reasoning: '2/2 key people backed by direct evidence', claimCount: 2, sourcedClaimCount: 2 },
  ],
}
