import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ICP } from '../types/prospect.js'
import { migrateGeography } from '../types/prospect.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const ICP_FILE = join(DATA_DIR, 'icp.json')

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function saveICP(icp: ICP): void {
  ensureDataDir()
  writeFileSync(ICP_FILE, JSON.stringify(icp, null, 2), 'utf-8')
}

export function loadICP(): ICP | null {
  ensureDataDir()
  if (!existsSync(ICP_FILE)) {
    return null
  }
  try {
    const raw = readFileSync(ICP_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    // Backwards compat: migrate old string geography to GeoTarget
    return {
      ...parsed,
      geography: migrateGeography(parsed.geography),
    } as ICP
  } catch {
    return null
  }
}
