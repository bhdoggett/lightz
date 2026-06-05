import { join } from 'path'
import { readdirSync, writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync, statSync } from 'fs'
import { homedir } from 'os'
import type { Config } from '../src/shared/types'

const SHOWS_DIR = join(homedir(), 'Documents', 'Church Lights')

export interface ShowInfo {
  name: string
  modifiedAt: number  // ms timestamp
}

function ensureDir(): void {
  if (!existsSync(SHOWS_DIR)) mkdirSync(SHOWS_DIR, { recursive: true })
}

function showPath(name: string): string {
  return join(SHOWS_DIR, `${name}.json`)
}

export function listShows(): ShowInfo[] {
  ensureDir()
  return readdirSync(SHOWS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      name: f.replace(/\.json$/, ''),
      modifiedAt: statSync(join(SHOWS_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt) // newest first
}

export function saveNamedShow(name: string, config: Config): void {
  ensureDir()
  writeFileSync(showPath(name), JSON.stringify(config, null, 2), 'utf-8')
}

export function loadNamedShow(name: string): Config {
  const raw = JSON.parse(readFileSync(showPath(name), 'utf-8'))
  if (!Array.isArray(raw.fixtures) || !Array.isArray(raw.scenes)) {
    throw new Error('Invalid show file')
  }
  return raw as Config
}

export function deleteNamedShow(name: string): void {
  unlinkSync(showPath(name))
}
