import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import type { ScrapedCompanyData } from './scraper.js'
import type { TalentProfile, TalentReport, TalentInsight, ProspectReport, OutreachEmail, TeamComposition } from '../types/prospect.js'

const client = new OpenAI()

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

// --- Department inference ---

function inferDepartment(role: string): string {
  const lower = role.toLowerCase()
  if (/engineer|developer|devops|sre|qa|frontend|backend|fullstack|full-stack|software|cto|vp.*eng/i.test(lower)) return 'Engineering'
  if (/design|ux|ui|creative|brand/i.test(lower)) return 'Design'
  if (/product|pm|program manager/i.test(lower)) return 'Product'
  if (/market|growth|content|seo|social|brand|cmw/i.test(lower)) return 'Marketing'
  if (/sale|account|business dev|bdr|sdr|revenue|cro/i.test(lower)) return 'Sales'
  if (/data|analy|machine learn|ai|ml|scientist/i.test(lower)) return 'Data & AI'
  if (/hr|people|talent|recruit|culture/i.test(lower)) return 'People'
  if (/finance|accounting|cfo|controller/i.test(lower)) return 'Finance'
  if (/operations|ops|coo|logistics|supply/i.test(lower)) return 'Operations'
  if (/legal|compliance|counsel/i.test(lower)) return 'Legal'
  if (/ceo|founder|co-founder|chief.*officer|president|exec/i.test(lower)) return 'Leadership'
  if (/support|success|customer/i.test(lower)) return 'Customer Success'
  return 'Other'
}

// --- Extract LinkedIn and GitHub URLs from page links ---

function extractSocialUrls(links: string[]): { linkedinUrls: Map<string, string>; githubUrls: Map<string, string> } {
  const linkedinUrls = new Map<string, string>()
  const githubUrls = new Map<string, string>()

  for (const link of links) {
    const liMatch = link.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/)
    if (liMatch) {
      const username = liMatch[1].toLowerCase()
      linkedinUrls.set(username, link.startsWith('http') ? link : `https://${link}`)
    }
    const ghMatch = link.match(/github\.com\/([a-zA-Z0-9\-_]+)/)
    if (ghMatch) {
      const username = ghMatch[1].toLowerCase()
      // Skip common non-user paths
      if (!['orgs', 'topics', 'explore', 'marketplace', 'settings', 'features'].includes(username)) {
        githubUrls.set(username, link.startsWith('http') ? link : `https://${link}`)
      }
    }
  }

  return { linkedinUrls, githubUrls }
}

// --- Extract detailed people from scraped data ---

export function extractDetailedPeople(scrapedData: ScrapedCompanyData): TalentProfile[] {
  const allLinks: string[] = []
  if (scrapedData.homepage?.links) allLinks.push(...scrapedData.homepage.links)
  if (scrapedData.about?.links) allLinks.push(...scrapedData.about.links)
  if (scrapedData.careers?.links) allLinks.push(...scrapedData.careers.links)

  const { linkedinUrls, githubUrls } = extractSocialUrls(allLinks)

  return scrapedData.teamMembers.map((member) => {
    const nameParts = member.name.toLowerCase().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts[nameParts.length - 1] || ''

    // Try to match social URLs by name fragments
    let linkedinUrl: string | undefined
    let githubUrl: string | undefined

    for (const [username, url] of linkedinUrls) {
      if (username.includes(firstName) && username.includes(lastName)) {
        linkedinUrl = url
        break
      }
    }
    for (const [username, url] of githubUrls) {
      if (username.includes(firstName) || username.includes(lastName)) {
        githubUrl = url
        break
      }
    }

    return {
      name: member.name,
      role: member.role,
      department: inferDepartment(member.role),
      skills: [],
      linkedinUrl,
      githubUrl,
      matchScore: 0,
      matchReasons: [],
      recruitingAngle: '',
    }
  })
}

// --- Scrape public GitHub profile ---

export async function scrapeGitHubProfile(
  username: string
): Promise<{ repos: number; languages: string[]; contributions: number; bio: string } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`https://github.com/${username}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const html = await res.text()
    const $ = cheerio.load(html)

    // Bio
    const bio = $('[data-bio-text], .p-note, .user-profile-bio').first().text().trim()

    // Repo count
    const repoText = $('a[href$="?tab=repositories"] span, nav a[href*="tab=repositories"] .Counter').first().text().trim()
    const repos = parseInt(repoText.replace(/[^0-9]/g, ''), 10) || 0

    // Languages from pinned repos or language stats
    const languages = new Set<string>()
    $('[itemprop="programmingLanguage"], span[class*="language-color"] + span, [data-color-mode] .repo-language-color + span').each((_, el) => {
      const lang = $(el).text().trim()
      if (lang) languages.add(lang)
    })
    // Also try the language bar on profile
    $('.f6.color-fg-muted span, .pinned-item-desc ~ p span').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length < 30 && !text.includes(' ')) languages.add(text)
    })

    // Contributions
    const contribText = $('h2.f4.text-normal.mb-2, .js-yearly-contributions h2').first().text().trim()
    const contribMatch = contribText.match(/([\d,]+)\s*contribution/)
    const contributions = contribMatch ? parseInt(contribMatch[1].replace(/,/g, ''), 10) : 0

    return {
      repos,
      languages: [...languages].slice(0, 10),
      contributions,
      bio,
    }
  } catch {
    return null
  }
}

// --- Poaching signals ---

export function inferPoachingSignals(companyReport: ProspectReport): TalentInsight[] {
  const insights: TalentInsight[] = []

  // Hiring velocity signals
  const jobCount = companyReport.jobInsights.length
  if (jobCount >= 5) {
    insights.push({
      title: 'High hiring volume',
      description: `Company has ${jobCount}+ open roles, suggesting rapid growth. Team members may be stretched thin and open to offers with better work-life balance.`,
      signal: 'positive',
    })
  }

  // Department concentration
  const deptCounts = new Map<string, number>()
  for (const job of companyReport.jobInsights) {
    const dept = job.department
    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1)
  }
  for (const [dept, count] of deptCounts) {
    if (count >= 3) {
      insights.push({
        title: `Heavy ${dept} hiring`,
        description: `Multiple open roles in ${dept} may indicate turnover or team scaling challenges. Current team members could be overworked.`,
        signal: 'positive',
      })
    }
  }

  // Funding stage signals
  const funding = companyReport.financialSignals.fundingStage.toLowerCase()
  if (funding.includes('seed') || funding.includes('early')) {
    insights.push({
      title: 'Early-stage company',
      description: 'Early-stage employees often wear many hats. Senior talent may be looking for more focused roles with better compensation.',
      signal: 'positive',
    })
  }
  if (funding.includes('growth') || funding.includes('series-c') || funding.includes('series-d')) {
    insights.push({
      title: 'Growth stage dynamics',
      description: 'Growth-stage companies often experience cultural shifts. Early employees who prefer startup culture may be open to new opportunities.',
      signal: 'positive',
    })
  }

  // Risk-based signals
  for (const flag of companyReport.risks.flags) {
    if (flag.severity === 'high') {
      insights.push({
        title: `Risk factor: ${flag.title}`,
        description: `${flag.description} — this organizational risk may make employees receptive to outreach.`,
        signal: 'positive',
      })
    }
  }

  // News-based signals
  const newsItems = companyReport.company.recentNews || []
  for (const news of newsItems) {
    const lower = news.toLowerCase()
    if (lower.includes('layoff') || lower.includes('reduction') || lower.includes('restructur')) {
      insights.push({
        title: 'Organizational disruption',
        description: `Recent news mentions restructuring or layoffs. Remaining employees may feel uncertain about their future.`,
        signal: 'positive',
      })
      break
    }
    if (lower.includes('acqui') || lower.includes('merger')) {
      insights.push({
        title: 'M&A activity',
        description: 'Acquisition or merger activity creates uncertainty. Key talent often considers options during transitions.',
        signal: 'positive',
      })
      break
    }
  }

  // Negative signals (reasons NOT to poach)
  if (companyReport.company.recentNews.some((n) => n.toLowerCase().includes('funding') || n.toLowerCase().includes('raised'))) {
    insights.push({
      title: 'Recent funding',
      description: 'Fresh funding often means stock refreshes and retention bonuses. Talent may be harder to recruit right after a raise.',
      signal: 'negative',
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: 'No strong signals detected',
      description: 'No clear indicators of talent mobility. Standard outreach approaches recommended.',
      signal: 'neutral',
    })
  }

  return insights
}

// --- Main talent analysis ---

export async function analyzeTalent(
  company: { name: string; domain: string },
  people: TalentProfile[],
  targetRole: string,
  targetSkills: string[],
  companyReport?: ProspectReport,
  onProgress?: (message: string) => Promise<void> | void
): Promise<TalentReport> {
  await onProgress?.('Analyzing talent fit...')

  // Enrich GitHub profiles for people who have them
  const enrichedPeople = [...people]
  for (let i = 0; i < enrichedPeople.length; i++) {
    const person = enrichedPeople[i]
    if (person.githubUrl) {
      const ghMatch = person.githubUrl.match(/github\.com\/([a-zA-Z0-9\-_]+)/)
      if (ghMatch) {
        const ghProfile = await scrapeGitHubProfile(ghMatch[1])
        if (ghProfile) {
          person.skills = [...new Set([...person.skills, ...ghProfile.languages])]
        }
      }
    }
  }

  await onProgress?.('Generating recruiting strategy...')

  const talentInsights = companyReport ? inferPoachingSignals(companyReport) : []

  // Build the people summary for AI
  const peopleSummary = enrichedPeople.map((p, i) =>
    `${i + 1}. ${p.name} — ${p.role} (${p.department})${p.skills.length > 0 ? ` | Skills: ${p.skills.join(', ')}` : ''}${p.linkedinUrl ? ' | Has LinkedIn' : ''}${p.githubUrl ? ' | Has GitHub' : ''}`
  ).join('\n')

  const companyContext = companyReport
    ? `Company size: ${companyReport.company.estimatedSize}. Industry: ${companyReport.company.industry}. Funding: ${companyReport.financialSignals.fundingStage}. Pain points: ${companyReport.painPoints.map(p => p.title).join(', ')}.`
    : `Company: ${company.name} (${company.domain})`

  const prompt = `You are an elite executive recruiter at a top-tier firm. Your outreach has a 40%+ response rate because you deeply research targets before reaching out.

TARGET ROLE: ${targetRole}
TARGET SKILLS: ${targetSkills.join(', ') || 'Not specified — infer from role title'}

COMPANY CONTEXT:
${companyContext}

TEAM MEMBERS FOUND:
${peopleSummary || 'No team members were found on the website.'}

${talentInsights.length > 0 ? `TALENT SIGNALS:\n${talentInsights.map(t => `- [${t.signal}] ${t.title}: ${t.description}`).join('\n')}` : ''}

Respond with a JSON object:
{
  "profiles": [
    {
      "index": 1,
      "matchScore": 85,
      "matchReasons": ["Specific reason 1 citing their actual role/skills", "Reason 2 about fit"],
      "recruitingAngle": "2-3 sentences: Why this specific person might be open to a move right now, based on company signals and their likely career trajectory. What would motivate them to respond?",
      "inferredSkills": ["skill1", "skill2", "skill3"]
    }
  ],
  "teamComposition": {
    "departments": [{ "name": "Engineering", "count": 5 }],
    "seniorityBreakdown": "Describe the seniority distribution — heavy on juniors? Top-heavy with VPs? Balanced?",
    "teamCulture": "2-3 sentences inferring team culture from job listings, about page language, team composition, and company positioning. What's it probably like to work here?"
  },
  "recruitingEmail": {
    "subject": "Compelling subject under 50 chars",
    "body": "A master-class recruiting email (200-300 words). Open with something that proves you researched their company. Reference specific company details. Explain the opportunity in terms of what THEY care about (growth, impact, tech). End with a low-friction CTA.",
    "personalizationNotes": ["Why this approach works for talent from this specific company"],
    "tone": "casual",
    "variant": "recruiting"
  },
  "personalizedOutreach": [
    {
      "name": "Person Name",
      "email": {
        "subject": "Personalized subject for THIS person under 50 chars",
        "body": "150-200 word email personalized to THIS specific person. Reference their actual role, skills, and likely motivations based on their position at the company.",
        "personalizationNotes": ["Why this approach works for this specific person"],
        "tone": "casual",
        "variant": "personal"
      }
    }
  ]
}

RULES:
- Score each person 0-100. Vary scores realistically — not everyone is a 70+.
- matchReasons: MUST cite the person's actual role, department, and skills. No generic reasons.
- recruitingAngle: MUST leverage company-specific signals (growth stage, pain points, hiring patterns, recent news).
- inferredSkills: Infer 3-6 skills from their role title and department. Be specific (e.g., "React" not just "frontend").
- teamComposition: Analyze the department distribution and seniority patterns. This is valuable strategic intel.
- personalizedOutreach: Generate individual outreach for the TOP 3 matched profiles only. Each must be genuinely personalized.
- recruitingEmail: The generic email must still reference 3+ specific details about the company.
- If no team members found, return empty profiles but still generate the generic email and best-guess team composition.
- Return ONLY valid JSON`

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an elite executive recruiter with a 40%+ response rate. Your outreach is deeply researched and personalized. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as {
      profiles: { index: number; matchScore: number; matchReasons: string[]; recruitingAngle: string; inferredSkills: string[] }[]
      recruitingEmail: OutreachEmail
      personalizedOutreach?: { name: string; email: OutreachEmail }[]
      teamComposition?: TeamComposition
    }

    // Merge AI scores into profiles
    const scoreMap = new Map<number, typeof parsed.profiles[0]>()
    for (const p of parsed.profiles || []) {
      scoreMap.set(p.index, p)
    }

    for (let i = 0; i < enrichedPeople.length; i++) {
      const aiData = scoreMap.get(i + 1)
      if (aiData) {
        enrichedPeople[i].matchScore = aiData.matchScore
        enrichedPeople[i].matchReasons = aiData.matchReasons
        enrichedPeople[i].recruitingAngle = aiData.recruitingAngle
        enrichedPeople[i].skills = [...new Set([...enrichedPeople[i].skills, ...(aiData.inferredSkills || [])])]
      }
    }

    // Sort by match score
    enrichedPeople.sort((a, b) => b.matchScore - a.matchScore)

    const recruitingEmail = parsed.recruitingEmail || {
      subject: `Opportunity at [Your Company] — ${targetRole}`,
      body: `Hi [Name],\n\nI came across your profile at ${company.name} and was impressed by your background. We're looking for a ${targetRole} and I think you'd be a great fit.\n\nWould you be open to a quick chat?`,
      personalizationNotes: ['Generic template — no AI analysis available'],
      tone: 'casual' as const,
      variant: 'recruiting',
    }

    const defaultTeamComp: TeamComposition = { departments: [], seniorityBreakdown: '', teamCulture: '' }

    return {
      company,
      targetRole,
      profiles: enrichedPeople,
      talentInsights,
      recruitingEmail,
      personalizedOutreach: parsed.personalizedOutreach || [],
      teamComposition: parsed.teamComposition || defaultTeamComp,
      generatedAt: new Date().toISOString(),
    }
  } catch {
    // Fallback if AI fails
    return {
      company,
      targetRole,
      profiles: enrichedPeople,
      talentInsights,
      recruitingEmail: {
        subject: `Opportunity — ${targetRole}`,
        body: `Hi [Name],\n\nI noticed your work at ${company.name}. We're hiring for a ${targetRole} role and I think your experience could be a great fit.\n\nWould you be open to a quick conversation?`,
        personalizationNotes: ['Fallback template'],
        tone: 'casual',
        variant: 'recruiting',
      },
      personalizedOutreach: [],
      teamComposition: { departments: [], seniorityBreakdown: '', teamCulture: '' },
      generatedAt: new Date().toISOString(),
    }
  }
}
