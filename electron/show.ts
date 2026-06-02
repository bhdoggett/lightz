import { dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type { Config } from '../src/shared/types'

const FILTERS = [{ name: 'Church Lights Show', extensions: ['json'] }]

function parseShowFile(path: string): Config {
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  if (!Array.isArray(raw.fixtures) || !Array.isArray(raw.scenes) || typeof raw.companionPort !== 'number') {
    throw new Error('Invalid show file format')
  }
  return raw as Config
}

export async function exportShow(config: Config): Promise<boolean> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Show File',
    defaultPath: 'show.json',
    filters: FILTERS,
  })
  if (canceled || !filePath) return false
  writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
  return true
}

export async function importShow(): Promise<Config | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open Show File',
    filters: FILTERS,
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  return parseShowFile(filePaths[0])
}
