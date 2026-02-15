import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProspectReport } from '../types/prospect.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const HISTORY_FILE = join(DATA_DIR, 'history.json')

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readHistory(): ProspectReport[] {
  ensureDataDir()
  if (!existsSync(HISTORY_FILE)) {
    return []
  }
  try {
    const raw = readFileSync(HISTORY_FILE, 'utf-8')
    return JSON.parse(raw) as ProspectReport[]
  } catch {
    return []
  }
}

function writeHistory(reports: ProspectReport[]): void {
  ensureDataDir()
  const tmp = HISTORY_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(reports, null, 2), 'utf-8')
  renameSync(tmp, HISTORY_FILE)
}

export function saveReport(report: ProspectReport): void {
  const history = readHistory()
  // Replace existing report for the same domain, or add new
  const idx = history.findIndex((r) => r.company.domain === report.company.domain)
  if (idx >= 0) {
    history[idx] = report
  } else {
    history.unshift(report)
  }
  writeHistory(history)
}

export function getHistory(limit = 50, offset = 0): { reports: ProspectReport[]; total: number } {
  const all = readHistory()
  const clamped = Math.min(Math.max(limit, 1), 200)
  const start = Math.max(offset, 0)
  return {
    reports: all.slice(start, start + clamped),
    total: all.length,
  }
}

export function deleteReport(domain: string): boolean {
  const history = readHistory()
  const filtered = history.filter((r) => r.company.domain !== domain)
  if (filtered.length === history.length) {
    return false
  }
  writeHistory(filtered)
  return true
}
