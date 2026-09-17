import { join } from 'path'
import { readdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, mkdirSync, existsSync, statSync } from 'fs'
import { app } from 'electron'
import type { Config } from '../src/shared/types'

function getShowsDir(): string {
  return join(app.getPath('documents'), 'Lightz')
}

export interface ShowInfo {
  name: string
  modifiedAt: number  // ms timestamp
}

function ensureDir(): string {
  const dir = getShowsDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function ensureShowsDir(): void {
  ensureDir()
  purgeOldDeletedShows()
}

const DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function purgeOldDeletedShows(now = Date.now()): void {
  const dir = join(getShowsDir(), 'deleted')
  if (!existsSync(dir)) return
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const path = join(dir, file)
    if (now - statSync(path).mtimeMs > DELETED_RETENTION_MS) unlinkSync(path)
  }
}

function showPath(name: string): string {
  return join(getShowsDir(), `${name}.json`)
}

function ensureDeletedDir(): string {
  const dir = join(getShowsDir(), 'deleted')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
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
  const dir = ensureDeletedDir()
  let target = join(dir, `${name}.json`)
  if (existsSync(target)) target = join(dir, `${name}-${Date.now()}.json`)
  renameSync(showPath(name), target)
}
