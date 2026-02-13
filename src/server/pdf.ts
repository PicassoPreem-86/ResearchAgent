import PDFDocument from 'pdfkit'
import type { ProspectReport, ComparisonReport } from '../types/prospect.js'

const COLORS = {
  primary: '#1a1a2e' as const,
  accent: '#4361ee' as const,
  text: '#333333' as const,
  lightText: '#666666' as const,
  border: '#e0e0e0' as const,
  bg: '#f8f9fa' as const,
  white: '#ffffff' as const,
  red: '#dc3545' as const,
  orange: '#fd7e14' as const,
  green: '#28a745' as const,
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'high': return COLORS.red
    case 'medium': return COLORS.orange
    case 'low': return COLORS.green
    default: return COLORS.lightText
  }
}

function addHeader(doc: PDFKit.PDFDocument, report: ProspectReport): void {
  // Dark header bar
  doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary)

  doc.fontSize(24).fillColor(COLORS.white).text(report.company.name, 50, 25, { width: 400 })
  doc.fontSize(10).fillColor('#aaaaaa')
    .text(`${report.company.domain}  |  ${report.company.industry}  |  ${report.company.estimatedSize} employees`, 50, 60)
    .text(`Confidence: ${report.company.confidence}/100  |  Template: ${report.template}`, 50, 78)

  doc.fillColor(COLORS.text)
  doc.y = 120
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5)
  doc.fontSize(14).fillColor(COLORS.accent).text(title)
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke(COLORS.border)
  doc.moveDown(0.3)
  doc.fillColor(COLORS.text)
}

function checkPageBreak(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - 80) {
    doc.addPage()
  }
}

export async function generatePdf(report: ProspectReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ---- PAGE 1: Company overview + SWOT ----
    addHeader(doc, report)

    // Description
    doc.fontSize(10).fillColor(COLORS.text).text(report.company.description, { lineGap: 3 })
    doc.moveDown(0.5)

    // Key Products
    if (report.company.keyProducts.length > 0) {
      doc.fontSize(9).fillColor(COLORS.lightText).text(`Key Products: ${report.company.keyProducts.join(', ')}`)
    }

    // Tech Stack
    if (report.company.techStack.length > 0) {
      doc.fontSize(9).fillColor(COLORS.lightText).text(`Tech Stack: ${report.company.techStack.join(', ')}`)
    }

    // Market Position
    if (report.marketPosition.segment) {
      addSectionTitle(doc, 'Market Position')
      doc.fontSize(9).fillColor(COLORS.text)
      doc.text(`Segment: ${report.marketPosition.segment}`)
      doc.text(`Pricing Tier: ${report.marketPosition.pricingTier}`)
      doc.text(`Target Audience: ${report.marketPosition.targetAudience}`)
      doc.text(`Market Maturity: ${report.marketPosition.marketMaturity}`)
      if (report.marketPosition.differentiators.length > 0) {
        doc.text(`Differentiators: ${report.marketPosition.differentiators.join(', ')}`)
      }
    }

    // Key People
    if (report.keyPeople.length > 0) {
      addSectionTitle(doc, 'Key People')
      for (const person of report.keyPeople) {
        checkPageBreak(doc, 30)
        doc.fontSize(9).fillColor(COLORS.text).text(`${person.name} — ${person.role}`, { continued: false })
        doc.fontSize(8).fillColor(COLORS.lightText).text(person.context)
      }
    }

    // SWOT Analysis
    addSectionTitle(doc, 'SWOT Analysis')
    const swotQuadrants = [
      { label: 'Strengths', items: report.swot.strengths, color: COLORS.green },
      { label: 'Weaknesses', items: report.swot.weaknesses, color: COLORS.red },
      { label: 'Opportunities', items: report.swot.opportunities, color: COLORS.accent },
      { label: 'Threats', items: report.swot.threats, color: COLORS.orange },
    ]

    for (const quadrant of swotQuadrants) {
      checkPageBreak(doc, 60)
      doc.fontSize(10).fillColor(quadrant.color).text(quadrant.label)
      for (const item of quadrant.items) {
        checkPageBreak(doc, 30)
        doc.fontSize(9).fillColor(COLORS.text).text(`  - ${item.title}: ${item.description}`)
        doc.fontSize(8).fillColor(COLORS.lightText).text(`    Evidence: ${item.evidence}`)
      }
      doc.moveDown(0.3)
    }

    // ---- PAGE 2: Pain Points + Job Insights + Financial + Risks ----
    doc.addPage()

    addSectionTitle(doc, 'Pain Points')
    for (const pp of report.painPoints) {
      checkPageBreak(doc, 50)
      doc.fontSize(10).fillColor(severityColor(pp.severity)).text(`[${pp.severity.toUpperCase()}] ${pp.title}`)
      doc.fontSize(9).fillColor(COLORS.text).text(pp.description, { indent: 10 })
      doc.fontSize(8).fillColor(COLORS.lightText).text(`Evidence: ${pp.evidence}`, { indent: 10 })
      doc.fontSize(8).fillColor(COLORS.lightText).text(`Confidence: ${pp.confidence}/100`, { indent: 10 })
      doc.moveDown(0.3)
    }

    addSectionTitle(doc, 'Job Insights')
    for (const job of report.jobInsights) {
      checkPageBreak(doc, 40)
      doc.fontSize(10).fillColor(COLORS.text).text(job.title)
      doc.fontSize(9).fillColor(COLORS.lightText).text(`Department: ${job.department}`)
      doc.fontSize(9).fillColor(COLORS.text).text(job.inference, { indent: 10 })
      doc.moveDown(0.3)
    }

    // Financial Signals
    if (report.financialSignals) {
      addSectionTitle(doc, 'Financial Signals')
      doc.fontSize(9).fillColor(COLORS.text)
      doc.text(`Funding Stage: ${report.financialSignals.fundingStage}`)
      doc.text(`Estimated Revenue: ${report.financialSignals.estimatedRevenue}`)
      doc.text(`Hiring Velocity: ${report.financialSignals.hiringVelocity}`)
      if (report.financialSignals.growthIndicators.length > 0) {
        doc.text(`Growth Indicators: ${report.financialSignals.growthIndicators.join(', ')}`)
      }
    }

    // Risk Assessment
    if (report.risks) {
      addSectionTitle(doc, 'Risk Assessment')
      doc.fontSize(10).fillColor(severityColor(report.risks.level)).text(`Overall Risk Level: ${report.risks.level.toUpperCase()}`)
      for (const flag of report.risks.flags) {
        checkPageBreak(doc, 30)
        doc.fontSize(9).fillColor(severityColor(flag.severity)).text(`[${flag.severity.toUpperCase()}] ${flag.title}`)
        doc.fontSize(9).fillColor(COLORS.text).text(flag.description, { indent: 10 })
      }
    }

    // ---- PAGE 3: Emails (for sales template) ----
    if (report.emails.length > 0) {
      doc.addPage()
      addSectionTitle(doc, 'Outreach Emails')
      for (const email of report.emails) {
        checkPageBreak(doc, 120)
        doc.fontSize(10).fillColor(COLORS.accent).text(`Variant: ${email.variant}`)
        doc.fontSize(10).fillColor(COLORS.text).text(`Subject: ${email.subject}`)
        doc.moveDown(0.2)
        doc.fontSize(9).fillColor(COLORS.text).text(email.body, { lineGap: 2 })
        doc.moveDown(0.2)
        doc.fontSize(8).fillColor(COLORS.lightText).text(`Personalization: ${email.personalizationNotes.join('; ')}`)
        doc.moveDown(0.8)
      }
    }

    // Footer on all pages
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(7).fillColor(COLORS.lightText)
        .text(
          `Generated by ResearchAgent  |  ${new Date(report.researchedAt).toLocaleDateString()}  |  Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 40,
          { align: 'center', width: doc.page.width - 100 }
        )
    }

    doc.end()
  })
}

export async function generateComparisonPdf(comparison: ComparisonReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ---- Title page ----
    doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary)
    doc.fontSize(22).fillColor(COLORS.white).text('Company Comparison Report', 50, 30)
    const companyNames = comparison.companies.map((c) => c.company.name).join('  vs  ')
    doc.fontSize(12).fillColor('#aaaaaa').text(companyNames, 50, 65, { width: doc.page.width - 100 })
    doc.fontSize(9).fillColor('#888888').text(`Generated: ${new Date(comparison.generatedAt).toLocaleDateString()}`, 50, 100)

    doc.fillColor(COLORS.text)
    doc.y = 140

    // Summary
    addSectionTitle(doc, 'Summary')
    doc.fontSize(10).fillColor(COLORS.text).text(comparison.comparison.summary, { lineGap: 3 })
    doc.moveDown(0.5)

    // Recommendation
    addSectionTitle(doc, 'Recommendation')
    doc.fontSize(10).fillColor(COLORS.text).text(comparison.comparison.recommendation, { lineGap: 3 })
    doc.moveDown(0.5)

    // Comparison Matrix
    addSectionTitle(doc, 'Comparison Matrix')
    for (const dim of comparison.comparison.dimensions) {
      checkPageBreak(doc, 80)
      doc.fontSize(11).fillColor(COLORS.accent).text(dim.name)
      doc.moveDown(0.2)
      for (const entry of dim.entries) {
        const scoreText = entry.score != null ? ` (${entry.score}/10)` : ''
        doc.fontSize(9).fillColor(COLORS.text).text(`  ${entry.domain}: ${entry.value}${scoreText}`)
      }
      doc.moveDown(0.5)
    }

    // Individual Company Summaries
    for (const report of comparison.companies) {
      doc.addPage()
      addHeader(doc, report)

      doc.fontSize(10).fillColor(COLORS.text).text(report.company.description, { lineGap: 3 })
      doc.moveDown(0.5)

      if (report.marketPosition.segment) {
        doc.fontSize(9).fillColor(COLORS.lightText)
          .text(`Market: ${report.marketPosition.segment} | Pricing: ${report.marketPosition.pricingTier} | Audience: ${report.marketPosition.targetAudience}`)
        doc.moveDown(0.3)
      }

      // SWOT summary
      addSectionTitle(doc, 'SWOT Highlights')
      const swotSections = [
        { label: 'Strengths', items: report.swot.strengths },
        { label: 'Weaknesses', items: report.swot.weaknesses },
        { label: 'Opportunities', items: report.swot.opportunities },
        { label: 'Threats', items: report.swot.threats },
      ]
      for (const section of swotSections) {
        if (section.items.length > 0) {
          doc.fontSize(9).fillColor(COLORS.accent).text(`${section.label}:`)
          for (const item of section.items) {
            checkPageBreak(doc, 20)
            doc.fontSize(8).fillColor(COLORS.text).text(`  - ${item.title}: ${item.description}`)
          }
        }
      }

      // Pain points
      if (report.painPoints.length > 0) {
        addSectionTitle(doc, 'Key Pain Points')
        for (const pp of report.painPoints.slice(0, 3)) {
          checkPageBreak(doc, 25)
          doc.fontSize(9).fillColor(severityColor(pp.severity)).text(`[${pp.severity.toUpperCase()}] ${pp.title}`)
          doc.fontSize(8).fillColor(COLORS.text).text(`  ${pp.description}`)
        }
      }
    }

    // Footer on all pages
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(7).fillColor(COLORS.lightText)
        .text(
          `Generated by ResearchAgent  |  ${new Date(comparison.generatedAt).toLocaleDateString()}  |  Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 40,
          { align: 'center', width: doc.page.width - 100 }
        )
    }

    doc.end()
  })
}
