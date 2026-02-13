import OpenAI from 'openai'
import type {
  ProspectReport,
  EmailTone,
  SellerContext,
  ReportTemplate,
  ComparisonReport,
  ComparisonMatrix,
  CompetitiveLandscape,
} from '../types/prospect.js'
import type { ScrapedCompanyData } from './scraper.js'

const client = new OpenAI()

interface SenderContext {
  name?: string
  company?: string
  role?: string
}

function computeConfidence(data: ScrapedCompanyData): number {
  let score = 10
  if (data.homepage && data.homepage.text.length > 100) score += 30
  if (data.about && data.about.text.length > 100) score += 25
  if (data.careers && data.careers.text.length > 100) score += 20
  if (data.jobListings.length > 0) score += 10
  if (data.homepage?.meta && Object.keys(data.homepage.meta).length > 2) score += 5
  return Math.min(score, 100)
}

const toneInstructions: Record<EmailTone, string> = {
  casual: 'Write in a casual, friendly tone — like a peer reaching out. Use contractions, short sentences, and conversational language. Avoid corporate speak.',
  formal: 'Write in a professional, formal tone — polished and executive-ready. Use proper grammar, structured paragraphs, and measured language. Avoid slang.',
  provocative: 'Write in a provocative, challenger-sale tone — bold and direct. Challenge an assumption they likely hold. Be slightly contrarian. Aim to make them think.',
  consultative: 'Write in a consultative, advisory tone — position yourself as a helpful expert. Lead with insights, ask thoughtful questions, and offer perspective rather than pitching.',
}

function getTemplateInstructions(template: ReportTemplate): string {
  switch (template) {
    case 'investor-dd':
      return `TEMPLATE FOCUS: Investor Due Diligence
Prioritize depth on: financial signals (funding stage, revenue indicators, burn rate signals), risk assessment (regulatory, market, operational), market position (TAM, competitive moat, defensibility), growth trajectory (hiring velocity, product expansion signals). SWOT should focus on investability — strengths as competitive moat, weaknesses as investment risks, opportunities as growth vectors, threats as market/execution risks.`

    case 'competitive-analysis':
      return `TEMPLATE FOCUS: Competitive Analysis
Prioritize depth on: market position (segment, pricing tier, positioning vs alternatives), differentiators (unique features, proprietary tech, brand strength), tech stack (architecture signals, platform choices), pricing signals. SWOT should focus on competitive advantages and vulnerabilities — strengths as competitive edges, weaknesses as exploitable gaps, opportunities as underserved segments, threats as competitive moves.`

    case 'partnership-eval':
      return `TEMPLATE FOCUS: Partnership Evaluation
Prioritize depth on: cultural signals (values, work style, communication patterns), complementary capabilities (what they bring that you lack), key people (decision makers, partnership leads), synergy potential. SWOT should focus on partnership fit — strengths as what they bring to a partnership, weaknesses as collaboration risks, opportunities as joint value creation, threats as partnership risks or misalignment.`

    case 'sales-research':
      return `TEMPLATE FOCUS: Sales Research
Prioritize depth on: pain points (specific, evidence-backed challenges), hiring signals (what job openings reveal about priorities), outreach email quality (deeply personalized, multi-variant). SWOT should focus on sales opportunity — strengths as reasons they can buy, weaknesses as pain you can solve, opportunities as trigger events for purchase, threats as reasons a deal might stall.`

    case 'general':
      return `TEMPLATE FOCUS: General Research
Provide balanced depth across all dimensions — company overview, SWOT, market position, risks, key people, financial signals, pain points, and outreach. No particular section should dominate.`
  }
}

function buildPrompt(
  domain: string,
  data: ScrapedCompanyData,
  senderContext?: SenderContext,
  tone: EmailTone = 'casual',
  sellerContext?: SellerContext,
  template: ReportTemplate = 'general'
): string {
  const senderInfo = senderContext
    ? `\nSender context — Name: ${senderContext.name || 'not provided'}, Company: ${senderContext.company || 'not provided'}, Role: ${senderContext.role || 'not provided'}`
    : ''

  const sellerInfo = sellerContext
    ? `\nSeller product context — Product: ${sellerContext.product || 'not provided'}, Value Proposition: ${sellerContext.valueProposition || 'not provided'}. Use this to position the email against the prospect's specific pain points.`
    : ''

  const confidence = computeConfidence(data)
  const templateInstructions = getTemplateInstructions(template)

  return `You are a McKinsey-caliber business analyst combined with a world-class B2B sales strategist. Your research briefs are worth $10,000+ because they surface non-obvious insights, connect dots between data points, and deliver actionable intelligence that drives real business decisions.

Analyze the following scraped website data for the company at ${domain} and produce a COMPREHENSIVE, DEEPLY DETAILED research report. Every section must provide genuine value — not surface-level observations. Dig deep.
${senderInfo}${sellerInfo}

${templateInstructions}

RAW WEBSITE DATA (including homepage, about, careers, pricing, blog, structured data, news):
${data.rawTexts || 'No website data could be scraped. Infer what you can from the domain name alone.'}

${data.jobListings.length > 0 ? `ACTIVE JOB LISTINGS:\n${data.jobListings.join('\n')}` : 'No job listings found.'}

DATA QUALITY: Confidence score ${confidence}/100. When confidence is low, clearly label inferences vs confirmed facts. When high, go deep with specific citations.

Respond with a JSON object matching this EXACT structure (no markdown, no code fences, just raw JSON):

{
  "executiveSummary": "A 3-5 sentence executive briefing that a CEO could read in 30 seconds and understand: what this company does, their strategic position, biggest opportunity, and biggest risk. This should be the single most valuable paragraph in the entire report.",
  "company": {
    "name": "Company Name (infer from website content)",
    "domain": "${domain}",
    "description": "3-4 sentence description covering: what they do, who they serve, their core value prop, and what makes them different. Be specific — avoid generic descriptions.",
    "industry": "Primary industry/vertical (be specific: not just 'technology' but 'developer tools' or 'healthcare analytics')",
    "estimatedSize": "Estimate with reasoning. Use ranges: '1-10', '11-50', '51-200', '201-500', '500+'. Cite evidence (job count, office mentions, team page size, about page language).",
    "techStack": ["List ALL technologies mentioned or implied — from job listings, website source, meta tags, and integrations. Be thorough."],
    "recentNews": ["Any announcements, funding, launches, partnerships, or milestones. Include dates when possible."],
    "keyProducts": ["Main products or services — be specific about what each does, not just names"],
    "confidence": ${confidence}
  },
  "painPoints": [
    {
      "title": "Specific pain point title (not generic)",
      "description": "2-3 sentences: Why this is a pain point RIGHT NOW. Connect it to their specific situation — their growth stage, their hiring patterns, their product trajectory. Explain the business impact.",
      "evidence": "VERBATIM quote or SPECIFIC signal from the scraped data. E.g., 'Their careers page mentions scaling challenges: [quote]' or 'They have 5 open DevOps roles suggesting infrastructure growing pains'",
      "severity": "high|medium|low",
      "confidence": 85
    }
  ],
  "jobInsights": [
    {
      "title": "Job title or hiring pattern",
      "department": "Department or function",
      "inference": "2-3 sentences: What this hiring pattern REVEALS about their strategy, challenges, or growth plans. Connect the dots — what does hiring a VP of Engineering + 5 SREs tell you about their product maturity?"
    }
  ],
  "swot": {
    "strengths": [{ "title": "...", "description": "2-3 sentences with specific reasoning", "evidence": "specific evidence from data" }],
    "weaknesses": [{ "title": "...", "description": "2-3 sentences explaining business impact", "evidence": "specific evidence from data" }],
    "opportunities": [{ "title": "...", "description": "2-3 sentences on market opportunity with reasoning", "evidence": "specific evidence from data" }],
    "threats": [{ "title": "...", "description": "2-3 sentences on why this threatens their position", "evidence": "specific evidence from data" }]
  },
  "marketPosition": {
    "segment": "Specific market segment (e.g., 'SMB project management tools' not just 'SaaS')",
    "pricingTier": "premium|mid-market|budget|freemium — with reasoning from pricing page data if available",
    "targetAudience": "Detailed ICP: company size, industry, buyer persona, use case. Be specific.",
    "differentiators": ["Each differentiator should explain WHY it matters competitively, not just what it is"],
    "marketMaturity": "early|growing|mature|declining"
  },
  "risks": {
    "level": "low|medium|high",
    "flags": [
      {
        "title": "Specific risk title",
        "description": "2-3 sentences: What the risk is, what could trigger it, and what the business impact would be. Be concrete.",
        "severity": "low|medium|high"
      }
    ]
  },
  "keyPeople": [
    {
      "name": "Person name",
      "role": "Their role/title",
      "context": "Why they matter: decision-making power, background, what they reveal about company direction. 1-2 sentences."
    }
  ],
  "financialSignals": {
    "fundingStage": "bootstrapped|seed|series-a|series-b|growth|public|unknown — cite evidence",
    "estimatedRevenue": "Best estimate with reasoning (e.g., 'Based on team size of ~50 and SaaS pricing, likely $5-15M ARR')",
    "growthIndicators": ["Each indicator should explain what it signals about trajectory — not just list a fact"],
    "hiringVelocity": "Detailed description: how many roles, which departments, what this pace suggests about growth rate and runway"
  },
  "competitiveLandscape": {
    "competitors": [
      { "name": "Competitor name", "domain": "competitor.com", "positioning": "How they compete — price, features, market segment, brand" }
    ],
    "moat": "1-2 sentences on what protects this company from competition — network effects, switching costs, proprietary tech, brand loyalty, etc.",
    "vulnerabilities": ["Specific competitive vulnerabilities — where they could lose to alternatives"]
  },
  "strategicRecommendations": [
    "3-5 actionable strategic recommendations. Each should be 1-2 sentences, specific and grounded in the data. E.g., 'Expand their enterprise offering — 3 of their 5 open roles are enterprise-focused, suggesting they see upmarket opportunity but may lack the infrastructure to support it.'"
  ],
  "emails": [
    {
      "subject": "Variant 1: Compelling, non-spammy subject line. Under 50 chars. Must reference something SPECIFIC.",
      "body": "Variant 1 email body (200-300 words). Must open with a SPECIFIC observation about their company that proves you did research. Include at least 3 personalized details. End with a soft, non-pushy CTA.",
      "personalizationNotes": ["Explain the strategy behind each personalized element — why you chose this angle"],
      "tone": "${tone}",
      "variant": "direct-value"
    },
    {
      "subject": "Variant 2: Different angle. Under 50 chars.",
      "body": "Variant 2 (200-300 words). Open by naming a SPECIFIC challenge they face. Bridge to a solution with empathy. Include company-specific details throughout.",
      "personalizationNotes": ["Strategy notes for each element"],
      "tone": "${tone}",
      "variant": "pain-point-led"
    },
    {
      "subject": "Variant 3: Curiosity-driven. Under 50 chars.",
      "body": "Variant 3 (200-300 words). Open with an intriguing insight or question that ONLY makes sense if you've researched their company. Create genuine curiosity.",
      "personalizationNotes": ["Strategy notes for each element"],
      "tone": "${tone}",
      "variant": "curiosity-hook"
    }
  ]
}

EMAIL TONE INSTRUCTIONS: ${toneInstructions[tone]}

EMAIL VARIANT REQUIREMENTS:
- "direct-value": Lead with tangible value tied to something SPECIFIC about their company — a product, a hiring trend, a strategic move.
- "pain-point-led": Name a SPECIFIC challenge (from your research, not generic). Show you understand the root cause before suggesting a solution.
- "curiosity-hook": Open with an insight so specific they'll think "how did they know that?" Make them want to reply to learn more.

Each variant MUST feel like a completely different email — different hook, angle, and CTA. NOT three rewrites of the same email.

CRITICAL QUALITY RULES:
- Executive summary: This is the MOST important field. Make it genuinely insightful, not a generic summary.
- Pain points: EXACTLY 4-6 items. Each MUST cite REAL evidence from the scraped data with specific quotes or signals. NO generic industry problems.
- Each pain point confidence score must reflect actual evidence strength (not all 80s — vary them).
- Job insights: 3-5 items. Each must connect hiring patterns to strategic implications. If no jobs found, infer likely priorities and why.
- SWOT: EXACTLY 3-4 items per quadrant. Each description must be 2-3 SUBSTANTIVE sentences with specific evidence. No one-liners.
- Competitive landscape: Include 3-5 competitors. Identify them from the data or infer from the market segment. The moat analysis must be specific.
- Strategic recommendations: 3-5 items. Each must be ACTIONABLE and GROUNDED in evidence from the report. No generic advice.
- Key people: Include all names/roles found. If none found, return empty array.
- Risk flags: 3-5 flags based on CONCRETE signals, not generic industry risks.
- ALL emails must reference at least 3 specific details from the website (product names, pricing, team info, recent news, job postings, etc).
- Financial signals: Provide detailed reasoning for each estimate, not just a label.
- Do NOT use placeholder text. Everything must be based on the actual scraped data.
- If data is sparse, explicitly state what you're inferring vs what you know, but still provide thorough analysis.
- Return ONLY valid JSON. No explanation text before or after.`
}

export async function analyzeCompany(
  domain: string,
  data: ScrapedCompanyData,
  senderContext?: SenderContext,
  onProgress?: (message: string) => void,
  tone: EmailTone = 'casual',
  sellerContext?: SellerContext,
  template: ReportTemplate = 'general'
): Promise<ProspectReport> {
  onProgress?.('Analyzing company data with AI...')

  const prompt = buildPrompt(domain, data, senderContext, tone, sellerContext, template)

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 16000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a McKinsey-caliber business analyst and senior B2B sales strategist. Your research reports are worth $10,000+. Every insight must be specific, evidence-backed, and actionable. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  })

  const text = response.choices[0]?.message?.content || ''

  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response as JSON. Raw response: ' + text.slice(0, 500))
  }

  const report = parsed as unknown as Omit<ProspectReport, 'researchedAt' | 'email' | 'template'>

  // Backward compat: set `email` to the first variant
  const emails = Array.isArray(report.emails) && report.emails.length > 0
    ? report.emails
    : []

  // Provide defaults for new fields if AI omitted them
  const defaultSwot = { strengths: [], weaknesses: [], opportunities: [], threats: [] }
  const defaultMarketPosition = { segment: '', pricingTier: '', targetAudience: '', differentiators: [], marketMaturity: 'growing' as const }
  const defaultRisks = { level: 'medium' as const, flags: [] }
  const defaultFinancialSignals = { fundingStage: 'unknown', estimatedRevenue: 'unknown', growthIndicators: [], hiringVelocity: 'unknown' }
  const defaultCompetitiveLandscape: CompetitiveLandscape = { competitors: [], moat: '', vulnerabilities: [] }

  return {
    ...report,
    executiveSummary: (report as unknown as { executiveSummary?: string }).executiveSummary || '',
    email: emails[0] || { subject: '', body: '', personalizationNotes: [], tone, variant: 'direct-value' },
    emails,
    swot: report.swot || defaultSwot,
    marketPosition: report.marketPosition || defaultMarketPosition,
    risks: report.risks || defaultRisks,
    keyPeople: report.keyPeople || [],
    financialSignals: report.financialSignals || defaultFinancialSignals,
    competitiveLandscape: (report as unknown as { competitiveLandscape?: CompetitiveLandscape }).competitiveLandscape || defaultCompetitiveLandscape,
    strategicRecommendations: (report as unknown as { strategicRecommendations?: string[] }).strategicRecommendations || [],
    template,
    researchedAt: new Date().toISOString(),
  }
}

export async function generateComparison(reports: ProspectReport[]): Promise<ComparisonReport> {
  const companySummaries = reports.map((r) => ({
    domain: r.company.domain,
    name: r.company.name,
    industry: r.company.industry,
    size: r.company.estimatedSize,
    description: r.company.description,
    techStack: r.company.techStack,
    keyProducts: r.company.keyProducts,
    painPoints: r.painPoints.map((p) => p.title),
    swot: r.swot,
    marketPosition: r.marketPosition,
    risks: r.risks,
    financialSignals: r.financialSignals,
  }))

  const prompt = `You are an elite business strategist producing a board-level competitive comparison. Your analysis helps executives make million-dollar decisions.

COMPANIES:
${JSON.stringify(companySummaries, null, 2)}

Respond with a JSON object matching this EXACT structure (no markdown, no code fences, just raw JSON):

{
  "dimensions": [
    {
      "name": "Dimension name",
      "entries": [
        { "domain": "company-domain.com", "value": "2-3 sentence detailed assessment on this dimension. Be specific — cite products, metrics, features.", "score": <1-10 score REQUIRED> }
      ],
      "winner": "domain-of-winner.com"
    }
  ],
  "overallWinner": "domain-of-overall-winner.com",
  "companySummaries": [
    {
      "domain": "company-domain.com",
      "strengths": ["Top 2-3 competitive strengths — be specific and substantive"],
      "weaknesses": ["Top 2-3 competitive weaknesses — cite evidence"]
    }
  ],
  "summary": "A 4-6 sentence executive summary of the competitive landscape. Highlight the most significant differences, market positioning gaps, and strategic implications. This should read like a McKinsey brief.",
  "recommendation": "A 2-3 sentence actionable recommendation. Who should you work with, invest in, or compete against — and WHY."
}

RULES:
- Include 10-12 comparison dimensions covering: Market Position, Product Breadth, Technical Architecture, Pricing Strategy, Team & Leadership, Growth Trajectory, Innovation Pace, Customer Base, Brand Strength, Financial Health, Risk Profile, Competitive Moat
- Every dimension MUST have a score (1-10) for EVERY company and a winner
- Every value must be 2-3 substantive sentences, not one-liners
- companySummaries must have an entry for every company
- overallWinner must be one of the compared domains
- Summary should be insightful enough to inform a real business decision
- Recommendation must be specific and actionable
- Return ONLY valid JSON`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an elite business strategist producing board-level competitive analysis. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  })

  const text = response.choices[0]?.message?.content || ''
  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()

  let comparison: ComparisonMatrix
  try {
    const raw = JSON.parse(cleaned)
    comparison = {
      dimensions: raw.dimensions || [],
      summary: raw.summary || '',
      recommendation: raw.recommendation || '',
      overallWinner: raw.overallWinner || undefined,
      companySummaries: raw.companySummaries || [],
    }
  } catch {
    throw new Error('Failed to parse comparison response as JSON. Raw: ' + text.slice(0, 500))
  }

  return {
    companies: reports,
    comparison,
    generatedAt: new Date().toISOString(),
  }
}
