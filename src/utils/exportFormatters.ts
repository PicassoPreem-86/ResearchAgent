import type { ProspectReport, ComparisonReport } from '@/types/prospect'

export function reportToJson(report: ProspectReport): string {
  return JSON.stringify(report, null, 2)
}

export function reportToMarkdown(report: ProspectReport): string {
  const { company, executiveSummary, swot, financialSignals, keyPeople, painPoints, risks, competitiveLandscape, strategicRecommendations, emails, email, jobInsights } = report
  const lines: string[] = []

  lines.push(`# ${company.name} - Research Report`)
  lines.push('')
  lines.push(`**Domain:** ${company.domain}`)
  if (company.industry) lines.push(`**Industry:** ${company.industry}`)
  if (company.estimatedSize) lines.push(`**Size:** ${company.estimatedSize}`)
  if (company.confidence != null) lines.push(`**Confidence:** ${Math.round(company.confidence)}%`)
  lines.push(`**Researched:** ${new Date(report.researchedAt).toLocaleDateString()}`)
  lines.push('')

  if (executiveSummary) {
    lines.push('## Executive Summary')
    lines.push('')
    lines.push(executiveSummary)
    lines.push('')
  }

  if (company.description) {
    lines.push('## Company Overview')
    lines.push('')
    lines.push(company.description)
    lines.push('')
    if (company.keyProducts.length > 0) {
      lines.push('**Key Products:**')
      company.keyProducts.forEach(p => lines.push(`- ${p}`))
      lines.push('')
    }
    if (company.recentNews.length > 0) {
      lines.push('**Recent Signals:**')
      company.recentNews.forEach(n => lines.push(`- ${n}`))
      lines.push('')
    }
  }

  if (report.marketPosition?.segment) {
    const mp = report.marketPosition
    lines.push('## Market Position')
    lines.push('')
    lines.push(`- **Segment:** ${mp.segment}`)
    lines.push(`- **Pricing Tier:** ${mp.pricingTier}`)
    lines.push(`- **Target Audience:** ${mp.targetAudience}`)
    lines.push(`- **Market Maturity:** ${mp.marketMaturity}`)
    if (mp.differentiators.length > 0) {
      lines.push(`- **Differentiators:**`)
      mp.differentiators.forEach(d => lines.push(`  - ${d}`))
    }
    lines.push('')
  }

  if (swot && (swot.strengths.length > 0 || swot.weaknesses.length > 0 || swot.opportunities.length > 0 || swot.threats.length > 0)) {
    lines.push('## SWOT Analysis')
    lines.push('')
    lines.push('| Category | Item | Evidence |')
    lines.push('|----------|------|----------|')
    swot.strengths.forEach(s => lines.push(`| Strength | ${s.title} | ${s.evidence} |`))
    swot.weaknesses.forEach(w => lines.push(`| Weakness | ${w.title} | ${w.evidence} |`))
    swot.opportunities.forEach(o => lines.push(`| Opportunity | ${o.title} | ${o.evidence} |`))
    swot.threats.forEach(t => lines.push(`| Threat | ${t.title} | ${t.evidence} |`))
    lines.push('')
  }

  if (financialSignals && (financialSignals.fundingStage || financialSignals.estimatedRevenue)) {
    lines.push('## Financial Signals')
    lines.push('')
    if (financialSignals.fundingStage) lines.push(`- **Funding Stage:** ${financialSignals.fundingStage}`)
    if (financialSignals.estimatedRevenue) lines.push(`- **Est. Revenue:** ${financialSignals.estimatedRevenue}`)
    if (financialSignals.hiringVelocity) lines.push(`- **Hiring Velocity:** ${financialSignals.hiringVelocity}`)
    if (financialSignals.growthIndicators.length > 0) {
      lines.push('- **Growth Indicators:**')
      financialSignals.growthIndicators.forEach(g => lines.push(`  - ${g}`))
    }
    lines.push('')
  }

  if (keyPeople && keyPeople.length > 0) {
    lines.push('## Key People')
    lines.push('')
    keyPeople.forEach(p => {
      lines.push(`- **${p.name}** - ${p.role}`)
      if (p.context) lines.push(`  - ${p.context}`)
    })
    lines.push('')
  }

  if (painPoints.length > 0) {
    lines.push('## Pain Points')
    lines.push('')
    painPoints.forEach(pp => {
      lines.push(`- **${pp.title}** (${pp.severity} severity, ${Math.round(pp.confidence)}% confidence)`)
      lines.push(`  - ${pp.description}`)
      if (pp.evidence) lines.push(`  - Evidence: ${pp.evidence}`)
    })
    lines.push('')
  }

  if (risks?.flags && risks.flags.length > 0) {
    lines.push('## Risk Assessment')
    lines.push('')
    lines.push(`**Overall Risk Level:** ${risks.level}`)
    lines.push('')
    risks.flags.forEach(f => {
      lines.push(`- **${f.title}** (${f.severity})`)
      lines.push(`  - ${f.description}`)
    })
    lines.push('')
  }

  if (competitiveLandscape?.competitors && competitiveLandscape.competitors.length > 0) {
    lines.push('## Competitive Landscape')
    lines.push('')
    if (competitiveLandscape.moat) {
      lines.push(`**Competitive Moat:** ${competitiveLandscape.moat}`)
      lines.push('')
    }
    competitiveLandscape.competitors.forEach(c => {
      lines.push(`- **${c.name}**${c.domain ? ` (${c.domain})` : ''}: ${c.positioning}`)
    })
    if (competitiveLandscape.vulnerabilities?.length > 0) {
      lines.push('')
      lines.push('**Vulnerabilities:**')
      competitiveLandscape.vulnerabilities.forEach(v => lines.push(`- ${v}`))
    }
    lines.push('')
  }

  if (strategicRecommendations && strategicRecommendations.length > 0) {
    lines.push('## Strategic Recommendations')
    lines.push('')
    strategicRecommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`)
    })
    lines.push('')
  }

  if (company.techStack.length > 0) {
    lines.push('## Tech Stack')
    lines.push('')
    lines.push(company.techStack.join(', '))
    lines.push('')
  }

  if (jobInsights.length > 0) {
    lines.push('## Hiring Signals')
    lines.push('')
    jobInsights.forEach(j => {
      lines.push(`- **${j.title}** (${j.department}): ${j.inference}`)
    })
    lines.push('')
  }

  const allEmails = emails && emails.length > 0 ? emails : email ? [email] : []
  if (allEmails.length > 0) {
    lines.push('## Outreach Emails')
    lines.push('')
    allEmails.forEach((e, i) => {
      if (allEmails.length > 1) lines.push(`### ${e.variant || `Variant ${i + 1}`} (${e.tone})`)
      lines.push(`**Subject:** ${e.subject}`)
      lines.push('')
      lines.push(e.body)
      lines.push('')
    })
  }

  return lines.join('\n')
}

export function reportToExecutiveSummary(report: ProspectReport): string {
  const lines: string[] = []
  lines.push(`# ${report.company.name}`)
  lines.push('')
  if (report.executiveSummary) {
    lines.push(report.executiveSummary)
  } else {
    lines.push(report.company.description || 'No executive summary available.')
  }
  return lines.join('\n')
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for older browsers
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (err) {
      reject(err)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

export function reportToCSV(report: ProspectReport): string {
  const headers = ['Domain', 'Company', 'Industry', 'Size', 'Funding Stage', 'Revenue Estimate', 'Risk Level', 'Pain Points', 'Key People', 'Competitors', 'Recommendation']
  const values = [
    report.company.domain,
    report.company.name,
    report.company.industry,
    report.company.estimatedSize,
    report.financialSignals?.fundingStage || '',
    report.financialSignals?.estimatedRevenue || '',
    report.risks?.level || '',
    (report.painPoints || []).map(p => p.title).join('; '),
    (report.keyPeople || []).map(p => `${p.name} (${p.role})`).join('; '),
    (report.competitiveLandscape?.competitors || []).map(c => c.name).join('; '),
    (report.strategicRecommendations || []).slice(0, 2).join('; '),
  ]

  return [headers.join(','), values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n')
}

export function reportToCleanJSON(report: ProspectReport): string {
  const clean = {
    company: report.company,
    executiveSummary: report.executiveSummary,
    swot: report.swot,
    marketPosition: report.marketPosition,
    competitiveLandscape: report.competitiveLandscape,
    painPoints: report.painPoints,
    risks: report.risks,
    keyPeople: report.keyPeople,
    financialSignals: report.financialSignals,
    jobInsights: report.jobInsights,
    strategicRecommendations: report.strategicRecommendations,
    researchedAt: report.researchedAt,
    template: report.template,
  }
  return JSON.stringify(clean, null, 2)
}

export function comparisonToMarkdown(comparison: ComparisonReport): string {
  const lines: string[] = []

  lines.push('# Company Comparison Report')
  lines.push(`> Generated: ${new Date(comparison.generatedAt).toLocaleDateString()}`)
  lines.push('')

  lines.push('## Companies Compared')
  for (const co of comparison.companies) {
    lines.push(`- **${co.company.name}** (${co.company.domain})`)
  }
  lines.push('')

  if (comparison.comparison.summary) {
    lines.push('## Summary')
    lines.push(comparison.comparison.summary)
    lines.push('')
  }

  if (comparison.comparison.dimensions?.length > 0) {
    lines.push('## Dimension Comparison')
    lines.push('')
    const domains = comparison.companies.map(c => c.company.domain)
    lines.push(`| Dimension | ${domains.join(' | ')} | Winner |`)
    lines.push(`|---|${domains.map(() => '---').join('|')}|---|`)
    for (const dim of comparison.comparison.dimensions) {
      const vals = domains.map(d => {
        const entry = dim.entries.find(e => e.domain === d)
        return entry ? `${entry.value}${entry.score != null ? ` (${entry.score}/10)` : ''}` : '-'
      })
      lines.push(`| ${dim.name} | ${vals.join(' | ')} | ${dim.winner || '-'} |`)
    }
    lines.push('')
  }

  if (comparison.comparison.overallWinner) {
    lines.push(`**Overall Winner:** ${comparison.comparison.overallWinner}`)
    lines.push('')
  }

  if (comparison.comparison.recommendation) {
    lines.push('## Recommendation')
    lines.push(comparison.comparison.recommendation)
    lines.push('')
  }

  lines.push('---')
  lines.push(`*Generated by ResearchAgent on ${new Date(comparison.generatedAt).toLocaleString()}*`)

  return lines.join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
