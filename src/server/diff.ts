import type { ProspectReport } from '../types/prospect.js'

export type ChangeType =
  | 'new_info'
  | 'removed_info'
  | 'changed_value'
  | 'new_risk'
  | 'resolved_risk'
  | 'hiring_change'
  | 'competitor_change'

export interface Change {
  type: ChangeType
  section: string
  field: string
  oldValue?: string
  newValue?: string
  description: string
}

export interface ChangeReport {
  domain: string
  changesDetected: number
  changes: Change[]
  significance: 'major' | 'minor' | 'none'
  summary: string
  checkedAt: string
  newReport?: ProspectReport
}

export function compareReports(
  oldReport: Partial<ProspectReport>,
  newReport: Partial<ProspectReport>,
  domain: string
): ChangeReport {
  const changes: Change[] = []

  // Compare executive summaries
  if (
    oldReport.executiveSummary &&
    newReport.executiveSummary &&
    oldReport.executiveSummary !== newReport.executiveSummary
  ) {
    changes.push({
      type: 'changed_value',
      section: 'executiveSummary',
      field: 'executiveSummary',
      description: 'Executive summary has been updated',
    })
  }

  // Compare pain points
  const oldPains = new Set(
    (oldReport.painPoints || []).map((p) => p.title)
  )
  const newPains = new Set(
    (newReport.painPoints || []).map((p) => p.title)
  )
  for (const pain of newPains) {
    if (!oldPains.has(pain)) {
      changes.push({
        type: 'new_info',
        section: 'painPoints',
        field: pain,
        description: `New pain point: ${pain}`,
      })
    }
  }
  for (const pain of oldPains) {
    if (!newPains.has(pain)) {
      changes.push({
        type: 'removed_info',
        section: 'painPoints',
        field: pain,
        description: `Removed pain point: ${pain}`,
      })
    }
  }

  // Compare risks
  const oldRisks = new Set(
    (oldReport.risks?.flags || []).map((r) => r.title)
  )
  const newRisks = new Set(
    (newReport.risks?.flags || []).map((r) => r.title)
  )
  for (const risk of newRisks) {
    if (!oldRisks.has(risk)) {
      changes.push({
        type: 'new_risk',
        section: 'risks',
        field: risk,
        description: `New risk: ${risk}`,
      })
    }
  }
  for (const risk of oldRisks) {
    if (!newRisks.has(risk)) {
      changes.push({
        type: 'resolved_risk',
        section: 'risks',
        field: risk,
        description: `Risk resolved: ${risk}`,
      })
    }
  }

  // Compare key people
  const oldPeople = new Set(
    (oldReport.keyPeople || []).map((p) => p.name)
  )
  const newPeople = new Set(
    (newReport.keyPeople || []).map((p) => p.name)
  )
  for (const person of newPeople) {
    if (!oldPeople.has(person)) {
      changes.push({
        type: 'new_info',
        section: 'keyPeople',
        field: person,
        description: `New person: ${person}`,
      })
    }
  }
  for (const person of oldPeople) {
    if (!newPeople.has(person)) {
      changes.push({
        type: 'removed_info',
        section: 'keyPeople',
        field: person,
        description: `Person removed: ${person}`,
      })
    }
  }

  // Compare financial signals
  if (
    oldReport.financialSignals?.fundingStage &&
    newReport.financialSignals?.fundingStage &&
    oldReport.financialSignals.fundingStage !== newReport.financialSignals.fundingStage
  ) {
    changes.push({
      type: 'changed_value',
      section: 'financialSignals',
      field: 'fundingStage',
      oldValue: oldReport.financialSignals.fundingStage,
      newValue: newReport.financialSignals.fundingStage,
      description: `Funding stage changed from ${oldReport.financialSignals.fundingStage} to ${newReport.financialSignals.fundingStage}`,
    })
  }

  // Compare job count (hiring velocity)
  const oldJobs = (oldReport.jobInsights || []).length
  const newJobs = (newReport.jobInsights || []).length
  if (Math.abs(newJobs - oldJobs) >= 3) {
    changes.push({
      type: 'hiring_change',
      section: 'jobInsights',
      field: 'jobCount',
      oldValue: String(oldJobs),
      newValue: String(newJobs),
      description:
        newJobs > oldJobs
          ? `Hiring surge: ${oldJobs} -> ${newJobs} open roles`
          : `Hiring slowdown: ${oldJobs} -> ${newJobs} open roles`,
    })
  }

  // Compare competitors
  const oldComps = new Set(
    oldReport.competitiveLandscape?.competitors?.map((c) => c.name) || []
  )
  const newComps = new Set(
    newReport.competitiveLandscape?.competitors?.map((c) => c.name) || []
  )
  for (const comp of newComps) {
    if (!oldComps.has(comp)) {
      changes.push({
        type: 'competitor_change',
        section: 'competitiveLandscape',
        field: comp,
        description: `New competitor identified: ${comp}`,
      })
    }
  }

  // Compare strategic recommendations
  const oldRecs = new Set(oldReport.strategicRecommendations || [])
  const newRecs = new Set(newReport.strategicRecommendations || [])
  for (const rec of newRecs) {
    if (!oldRecs.has(rec)) {
      changes.push({
        type: 'new_info',
        section: 'strategicRecommendations',
        field: rec.slice(0, 60),
        description: `New recommendation added`,
      })
    }
  }

  // Determine significance
  const hasNewRisk = changes.some((c) => c.type === 'new_risk')
  const hasHiringChange = changes.some((c) => c.type === 'hiring_change')
  const hasFundingChange = changes.some((c) => c.section === 'financialSignals')

  const significance: ChangeReport['significance'] =
    hasNewRisk || hasFundingChange || hasHiringChange || changes.length >= 5
      ? 'major'
      : changes.length > 0
        ? 'minor'
        : 'none'

  const summary =
    changes.length === 0
      ? 'No significant changes detected.'
      : `${changes.length} change${changes.length === 1 ? '' : 's'} detected: ${changes
          .slice(0, 3)
          .map((c) => c.description)
          .join('; ')}${changes.length > 3 ? ` and ${changes.length - 3} more` : ''}`

  return {
    domain,
    changesDetected: changes.length,
    changes,
    significance,
    summary,
    checkedAt: new Date().toISOString(),
  }
}
