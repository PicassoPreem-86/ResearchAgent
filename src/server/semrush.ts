const SEMRUSH_API = 'https://api.semrush.com/'

export interface DomainOverview {
  domain: string
  rank: number
  organicKeywords: number
  organicTraffic: number
  organicCost: number
  adwordsKeywords: number
  adwordsTraffic: number
  adwordsCost: number
}

export interface OrganicCompetitor {
  domain: string
  commonKeywords: number
  organicKeywords: number
  organicTraffic: number
  organicCost: number
  adwordsKeywords: number
}

export interface DomainKeyword {
  keyword: string
  position: number
  searchVolume: number
  cpc: number
  url: string
  traffic: number
  trafficCost: number
}

function parseSemrushResponse<T>(
  raw: string,
  mapper: (row: Record<string, string>) => T
): T[] {
  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(';')
  const results: T[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || ''
    })
    results.push(mapper(row))
  }

  return results
}

async function semrushRequest(params: Record<string, string>): Promise<string | null> {
  const apiKey = process.env.SEMRUSH_API_KEY
  if (!apiKey) return null

  try {
    const url = new URL(SEMRUSH_API)
    url.searchParams.set('key', apiKey)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return null

    const text = await res.text()
    if (text.startsWith('ERROR')) return null

    return text
  } catch {
    return null
  }
}

export async function getDomainOverview(
  domain: string,
  database = 'us'
): Promise<DomainOverview | null> {
  const raw = await semrushRequest({
    type: 'domain_ranks',
    export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
    domain,
    database,
  })

  if (!raw) return null

  const results = parseSemrushResponse(raw, (row) => ({
    domain: row['Domain'] || row['Dn'] || domain,
    rank: parseInt(row['Rank'] || row['Rk'] || '0', 10),
    organicKeywords: parseInt(row['Organic Keywords'] || row['Or'] || '0', 10),
    organicTraffic: parseInt(row['Organic Traffic'] || row['Ot'] || '0', 10),
    organicCost: parseFloat(row['Organic Cost'] || row['Oc'] || '0'),
    adwordsKeywords: parseInt(row['Adwords Keywords'] || row['Ad'] || '0', 10),
    adwordsTraffic: parseInt(row['Adwords Traffic'] || row['At'] || '0', 10),
    adwordsCost: parseFloat(row['Adwords Cost'] || row['Ac'] || '0'),
  }))

  return results[0] || null
}

export async function getOrganicCompetitors(
  domain: string,
  database = 'us',
  limit = 20
): Promise<OrganicCompetitor[]> {
  const raw = await semrushRequest({
    type: 'domain_organic_organic',
    export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad',
    domain,
    database,
    display_limit: String(limit),
  })

  if (!raw) return []

  return parseSemrushResponse(raw, (row) => ({
    domain: row['Domain'] || row['Dn'] || '',
    commonKeywords: parseInt(row['Common Keywords'] || row['Cr'] || '0', 10),
    organicKeywords: parseInt(row['Organic Keywords'] || row['Or'] || '0', 10),
    organicTraffic: parseInt(row['Organic Traffic'] || row['Ot'] || '0', 10),
    organicCost: parseFloat(row['Organic Cost'] || row['Oc'] || '0'),
    adwordsKeywords: parseInt(row['Adwords Keywords'] || row['Ad'] || '0', 10),
  })).filter((c) => c.domain && c.domain !== domain)
}

export async function getDomainKeywords(
  domain: string,
  database = 'us',
  limit = 10
): Promise<DomainKeyword[]> {
  const raw = await semrushRequest({
    type: 'domain_organic',
    export_columns: 'Ph,Po,Nq,Cp,Ur,Tr,Tc',
    domain,
    database,
    display_limit: String(limit),
  })

  if (!raw) return []

  return parseSemrushResponse(raw, (row) => ({
    keyword: row['Keyword'] || row['Ph'] || '',
    position: parseInt(row['Position'] || row['Po'] || '0', 10),
    searchVolume: parseInt(row['Search Volume'] || row['Nq'] || '0', 10),
    cpc: parseFloat(row['CPC'] || row['Cp'] || '0'),
    url: row['Url'] || row['Ur'] || '',
    traffic: parseFloat(row['Traffic (%)'] || row['Tr'] || '0'),
    trafficCost: parseFloat(row['Traffic Cost (%)'] || row['Tc'] || '0'),
  }))
}

export function formatTraffic(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
