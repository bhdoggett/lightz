import { join } from 'path'
import { readdirSync, writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync, statSync, renameSync } from 'fs'
import { app } from 'electron'
import type { Config } from '../src/shared/types'

const OLD_FOLDER_NAME = 'Church Lights'
const NEW_FOLDER_NAME = 'Lightz'

function getShowsDir(): string {
  return join(app.getPath('documents'), NEW_FOLDER_NAME)
}

export interface ShowInfo {
  name: string
  modifiedAt: number  // ms timestamp
}

// Migrate shows folder from "Church Lights" → "Lightz" on first run after rebrand
export function migrateShowsFolder(): void {
  const oldDir = join(app.getPath('documents'), OLD_FOLDER_NAME)
  const newDir = getShowsDir()
  if (existsSync(oldDir) && !existsSync(newDir)) {
    try {
      renameSync(oldDir, newDir)
      console.log(`[shows] migrated ${OLD_FOLDER_NAME} → ${NEW_FOLDER_NAME}`)
    } catch (e) {
      console.error('[shows] migration failed:', e)
    }
  }
}

function ensureDir(): string {
  const dir = getShowsDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function showPath(name: string): string {
  return join(getShowsDir(), `${name}.json`)
}

export function listShows(): ShowInfo[] {
  const dir = ensureDir()
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      name: f.replace(/\.json$/, ''),
      modifiedAt: statSync(join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
}

export function saveNamedShow(name: string, config: Config): void {
  ensureDir()
  writeFileSync(showPath(name), JSON.stringify(config, null, 2), 'utf-8')
}

export function loadNamedShow(name: string): Config {
  const raw = JSON.parse(readFileSync(showPath(name), 'utf-8'))
  if (!Array.isArray(raw.fixtures) || !Array.isArray(raw.scenes)) {
    throw new Error('Invalid show file format')
  }
  return { groups: [], ...raw } as Config
}

export function deleteNamedShow(name: string): void {
  unlinkSync(showPath(name))
}
