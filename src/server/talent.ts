import OpenAI from 'openai'
import { searchGoogle } from './discover.js'
import type { TalentProfile, TalentReport, OutreachEmail, GeoTarget } from '../types/prospect.js'
import { geoTargetToLabel, hasGeoSelections } from '../types/prospect.js'

const client = new OpenAI()

function isEngineeringRole(role: string): boolean {
  return /engineer|developer|devops|sre|frontend|backend|fullstack|full-stack|software|programmer|coder|architect/i.test(role)
}

// --- Search Google for LinkedIn profiles ---

async function searchLinkedIn(
  role: string,
  skills: string[],
  location?: GeoTarget,
  seniority?: string
): Promise<{ name: string; title: string; snippet: string; url: string }[]> {
  const queries: string[] = []

  const skillsPart = skills.length > 0 ? skills.slice(0, 3).join(' ') : ''
  const seniorityPart = seniority && seniority !== 'any' ? seniority : ''

  // Build location terms — generate per-location queries for better results
  const locationTerms: string[] = []
  if (location && hasGeoSelections(location)) {
    locationTerms.push(...location.metros, ...location.countries, ...location.regions)
  }

  if (locationTerms.length === 0) {
    // No location filter — single query
    queries.push(`site:linkedin.com/in ${seniorityPart} "${role}" ${skillsPart}`.trim())
    if (skills.length > 0) {
      queries.push(`site:linkedin.com/in "${role}" ${skills.slice(0, 2).join(' OR ')}`.trim())
    }
  } else {
    // Generate per-location queries (cap at 4 locations to avoid too many queries)
    for (const loc of locationTerms.slice(0, 4)) {
      queries.push(`site:linkedin.com/in ${seniorityPart} "${role}" ${skillsPart} "${loc}"`.trim())
    }
    if (skills.length > 0 && locationTerms.length > 0) {
      queries.push(`site:linkedin.com/in "${role}" ${skills.slice(0, 2).join(' OR ')} "${locationTerms[0]}"`.trim())
    }
  }

  const results: { name: string; title: string; snippet: string; url: string }[] = []
  const seenUrls = new Set<string>()

  for (const query of queries) {
    const googleResults = await searchGoogle(query)

    for (const r of googleResults) {
      if (!r.link.includes('linkedin.com/in/')) continue
      if (seenUrls.has(r.link)) continue
      seenUrls.add(r.link)

      // LinkedIn titles: "John Doe - Senior Engineer - Company | LinkedIn"
      const titleParts = r.title.replace(/\s*[|·]\s*LinkedIn\s*$/i, '').split(/\s*[-–—]\s*/)
      const name = titleParts[0]?.trim() || ''
      const title = titleParts.slice(1).join(' - ').trim() || ''

      if (name && name.length > 2) {
        results.push({ name, title, snippet: r.snippet, url: r.link })
      }
    }
  }

  return results.slice(0, 25)
}

// --- Search Google for GitHub developer profiles ---

async function searchGitHub(
  role: string,
  skills: string[]
): Promise<{ name: string; title: string; snippet: string; url: string }[]> {
  const skillsPart = skills.length > 0 ? skills.slice(0, 3).join(' ') : 'developer'
  const query = `site:github.com "${skillsPart}" ${role} followers`

  const googleResults = await searchGoogle(query)
  const results: { name: string; title: string; snippet: string; url: string }[] = []

  for (const r of googleResults) {
    const ghMatch = r.link.match(/github\.com\/([a-zA-Z0-9\-_]+)\/?$/)
    if (!ghMatch) continue
    const username = ghMatch[1]
    if (['orgs', 'topics', 'explore', 'marketplace', 'settings', 'features', 'trending', 'collections', 'about', 'pricing'].includes(username)) continue

    const name = r.title.replace(/\s*·\s*GitHub\s*$/i, '').replace(/\([^)]*\)/, '').trim()
    if (name && name.length > 2) {
      results.push({ name, title: '', snippet: r.snippet, url: r.link })
    }
  }

  return results.slice(0, 10)
}

// --- Main talent search ---

export async function searchTalent(
  targetRole: string,
  targetSkills: string[],
  location?: GeoTarget,
  seniority?: string,
  onProgress?: (message: string) => Promise<void> | void
): Promise<TalentReport> {
  await onProgress?.('Searching LinkedIn for matching profiles...')

  const linkedInResults = await searchLinkedIn(targetRole, targetSkills, location, seniority)

  let githubResults: { name: string; title: string; snippet: string; url: string }[] = []
  if (isEngineeringRole(targetRole)) {
    await onProgress?.('Searching GitHub for developers...')
    githubResults = await searchGitHub(targetRole, targetSkills)
  }

  await onProgress?.('Analyzing candidate profiles...')

  // Merge candidates, dedupe by name
  const candidates: { name: string; title: string; snippet: string; url: string; source: string }[] = []

  for (const r of linkedInResults) {
    candidates.push({ ...r, source: 'linkedin' })
  }
  for (const r of githubResults) {
    const nameLower = r.name.toLowerCase()
    if (!candidates.some((c) => c.name.toLowerCase() === nameLower)) {
      candidates.push({ ...r, source: 'github' })
    }
  }

  const emptyReport: TalentReport = {
    search: { role: targetRole, skills: targetSkills, location, seniority },
    targetRole,
    profiles: [],
    recruitingEmail: {
      subject: `${targetRole} opportunity`,
      body: `Hi [Name],\n\nWe're hiring a ${targetRole} and your background caught our attention.\n\nWould you be open to a quick chat?`,
      personalizationNotes: ['No candidates found — try broadening your search'],
      tone: 'casual',
      variant: 'outreach',
    },
    personalizedOutreach: [],
    generatedAt: new Date().toISOString(),
  }

  if (candidates.length === 0) return emptyReport

  await onProgress?.('Scoring fit and drafting outreach...')

  const candidateSummary = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} — ${c.title || 'No title'} (Source: ${c.source})${c.snippet ? `\n   Context: ${c.snippet}` : ''}\n   Profile: ${c.url}`
    )
    .join('\n')

  const prompt = `You are a hiring manager's AI assistant helping find the best candidates for an open role.

TARGET ROLE: ${targetRole}
REQUIRED SKILLS: ${targetSkills.join(', ') || 'Not specified — infer from role title'}
${location && hasGeoSelections(location) ? `PREFERRED LOCATION: ${geoTargetToLabel(location)}` : ''}
${seniority && seniority !== 'any' ? `SENIORITY LEVEL: ${seniority}` : ''}

CANDIDATE PROFILES FOUND:
${candidateSummary}

Respond with a JSON object:
{
  "profiles": [
    {
      "index": 1,
      "matchScore": 85,
      "matchReasons": ["Specific reason citing their actual experience/skills", "Another relevant reason"],
      "fitSummary": "2-3 sentences explaining why this person would be a strong candidate for the role. Focus on their experience, skills, and what they'd bring to the team.",
      "inferredSkills": ["skill1", "skill2", "skill3"],
      "currentCompany": "Company name if visible in their title/snippet, or null",
      "department": "Engineering, Design, Product, Marketing, Sales, etc."
    }
  ],
  "outreachEmail": {
    "subject": "Compelling subject under 50 chars about the opportunity",
    "body": "A professional, warm outreach email (200-300 words). Lead with what makes the role exciting. Describe the opportunity in terms of growth, impact, and technology. End with a low-friction CTA. This is a general template.",
    "personalizationNotes": ["Tips for customizing this template for individual candidates"],
    "tone": "casual",
    "variant": "outreach"
  },
  "personalizedOutreach": [
    {
      "name": "Person Name",
      "email": {
        "subject": "Personalized subject for THIS person under 50 chars",
        "body": "150-200 word email personalized to THIS specific candidate. Reference their actual experience and explain why they'd be great for this role.",
        "personalizationNotes": ["Why this approach works for this person"],
        "tone": "casual",
        "variant": "personal"
      }
    }
  ]
}

RULES:
- Score each person 0-100 based on fit for the target role. Vary scores realistically — not everyone is a 70+.
- matchReasons: MUST reference the person's actual title, experience, or skills from their profile. No generic reasons.
- fitSummary: Focus on what makes them a GOOD HIRE — their strengths, relevant experience, what they'd bring. Do NOT focus on why they'd leave their current job.
- inferredSkills: Infer 3-6 relevant skills from their title and context. Be specific (e.g., "React" not just "frontend").
- personalizedOutreach: Generate for the TOP 3 matched candidates only. Each must be genuinely personalized.
- outreachEmail: A warm, professional template focused on the opportunity you're offering.
- If no meaningful info is available for a candidate, score them 30-50.
- Return ONLY valid JSON`

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an expert hiring assistant that helps teams find great candidates. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as {
      profiles: {
        index: number
        matchScore: number
        matchReasons: string[]
        fitSummary: string
        inferredSkills: string[]
        currentCompany?: string
        department?: string
      }[]
      outreachEmail: OutreachEmail
      personalizedOutreach?: { name: string; email: OutreachEmail }[]
    }

    const scoreMap = new Map<number, (typeof parsed.profiles)[0]>()
    for (const p of parsed.profiles || []) {
      scoreMap.set(p.index, p)
    }

    const profiles: TalentProfile[] = candidates.map((candidate, i) => {
      const aiData = scoreMap.get(i + 1)
      return {
        name: candidate.name,
        role: candidate.title || targetRole,
        department: aiData?.department || 'Unknown',
        skills: aiData?.inferredSkills || [],
        linkedinUrl: candidate.source === 'linkedin' ? candidate.url : undefined,
        githubUrl: candidate.source === 'github' ? candidate.url : undefined,
        matchScore: aiData?.matchScore ?? 40,
        matchReasons: aiData?.matchReasons ?? [],
        fitSummary: aiData?.fitSummary ?? '',
        source: candidate.source,
        currentCompany: aiData?.currentCompany || undefined,
      }
    })

    profiles.sort((a, b) => b.matchScore - a.matchScore)

    return {
      search: { role: targetRole, skills: targetSkills, location, seniority },
      targetRole,
      profiles,
      recruitingEmail: parsed.outreachEmail || {
        subject: `${targetRole} opportunity`,
        body: `Hi [Name],\n\nWe're hiring a ${targetRole} and your background caught our attention.\n\nWould you be open to a quick chat?`,
        personalizationNotes: ['Generic template'],
        tone: 'casual',
        variant: 'outreach',
      },
      personalizedOutreach: parsed.personalizedOutreach || [],
      generatedAt: new Date().toISOString(),
    }
  } catch {
    const profiles: TalentProfile[] = candidates.map((c) => ({
      name: c.name,
      role: c.title || targetRole,
      department: 'Unknown',
      skills: [],
      linkedinUrl: c.source === 'linkedin' ? c.url : undefined,
      githubUrl: c.source === 'github' ? c.url : undefined,
      matchScore: 40,
      matchReasons: [],
      fitSummary: '',
      source: c.source,
    }))

    return {
      search: { role: targetRole, skills: targetSkills, location, seniority },
      targetRole,
      profiles,
      recruitingEmail: {
        subject: `${targetRole} opportunity`,
        body: `Hi [Name],\n\nWe're hiring a ${targetRole} and your experience caught our eye.\n\nWould you be open to a quick conversation?`,
        personalizationNotes: ['Fallback template'],
        tone: 'casual',
        variant: 'outreach',
      },
      personalizedOutreach: [],
      generatedAt: new Date().toISOString(),
    }
  }
}
