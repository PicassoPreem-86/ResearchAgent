export type SignalType =
  | 'hiring_surge'
  | 'hiring_slowdown'
  | 'new_funding'
  | 'pricing_change'
  | 'leadership_change'
  | 'product_launch'
  | 'tech_stack_change'
  | 'competitor_move'
  | 'risk_escalation'
  | 'risk_resolved'
  | 'market_shift'

export type SignalSeverity = 'info' | 'notable' | 'critical'

export interface Signal {
  id: string
  type: SignalType
  severity: SignalSeverity
  title: string
  description: string
  domain: string
  source: string | null
  detectedAt: string
  read: boolean
}

export function detectSignals(domain: string, oldReport: any, newReport: any): Signal[] {
  const signals: Signal[] = []
  const now = new Date().toISOString()
  const id = () => crypto.randomUUID()

  // Hiring signals
  const oldJobs = (oldReport?.jobInsights || []).length
  const newJobs = (newReport?.jobInsights || []).length
  if (newJobs > oldJobs * 1.5 && newJobs - oldJobs >= 3) {
    signals.push({
      id: id(), type: 'hiring_surge', severity: 'notable',
      title: `Hiring surge at ${domain}`,
      description: `Open roles increased from ${oldJobs} to ${newJobs} (${Math.round((newJobs / Math.max(1, oldJobs) - 1) * 100)}% increase)`,
      domain, source: null, detectedAt: now, read: false,
    })
  } else if (oldJobs > 0 && newJobs < oldJobs * 0.5) {
    signals.push({
      id: id(), type: 'hiring_slowdown', severity: 'notable',
      title: `Hiring slowdown at ${domain}`,
      description: `Open roles decreased from ${oldJobs} to ${newJobs}`,
      domain, source: null, detectedAt: now, read: false,
    })
  }

  // Funding signals
  const oldFunding = oldReport?.financialSignals?.fundingStage
  const newFunding = newReport?.financialSignals?.fundingStage
  if (oldFunding && newFunding && oldFunding !== newFunding) {
    signals.push({
      id: id(), type: 'new_funding', severity: 'critical',
      title: `New funding round at ${domain}`,
      description: `Funding stage changed from "${oldFunding}" to "${newFunding}"`,
      domain, source: null, detectedAt: now, read: false,
    })
  }

  // Leadership changes
  const oldPeople = new Set((oldReport?.keyPeople || []).map((p: any) => p.name))
  const newPeople = (newReport?.keyPeople || [])
  const newLeaders = newPeople.filter((p: any) =>
    !oldPeople.has(p.name) && /ceo|cto|cfo|coo|vp|president|founder/i.test(p.role)
  )
  if (newLeaders.length > 0) {
    signals.push({
      id: id(), type: 'leadership_change', severity: 'notable',
      title: `Leadership change at ${domain}`,
      description: `New: ${newLeaders.map((l: any) => `${l.name} (${l.role})`).join(', ')}`,
      domain, source: null, detectedAt: now, read: false,
    })
  }

  // Risk escalation / resolution
  const oldRiskLevel = oldReport?.risks?.level
  const newRiskLevel = newReport?.risks?.level
  const riskOrder = ['low', 'medium', 'high', 'critical']
  if (oldRiskLevel && newRiskLevel && riskOrder.indexOf(newRiskLevel) > riskOrder.indexOf(oldRiskLevel)) {
    signals.push({
      id: id(), type: 'risk_escalation', severity: 'critical',
      title: `Risk escalated at ${domain}`,
      description: `Risk level changed from "${oldRiskLevel}" to "${newRiskLevel}"`,
      domain, source: null, detectedAt: now, read: false,
    })
  } else if (oldRiskLevel && newRiskLevel && riskOrder.indexOf(newRiskLevel) < riskOrder.indexOf(oldRiskLevel)) {
    signals.push({
      id: id(), type: 'risk_resolved', severity: 'info',
      title: `Risk reduced at ${domain}`,
      description: `Risk level improved from "${oldRiskLevel}" to "${newRiskLevel}"`,
      domain, source: null, detectedAt: now, read: false,
    })
  }

  // New competitors detected
  const oldComps = new Set((oldReport?.competitiveLandscape?.competitors || []).map((c: any) => c.name))
  const newComps = (newReport?.competitiveLandscape?.competitors || []).filter((c: any) => !oldComps.has(c.name))
  if (newComps.length >= 2) {
    signals.push({
      id: id(), type: 'competitor_move', severity: 'info',
      title: `New competitors detected for ${domain}`,
      description: `${newComps.length} new competitors: ${newComps.map((c: any) => c.name).join(', ')}`,
      domain, source: null, detectedAt: now, read: false,
    })
  }

  return signals
}
