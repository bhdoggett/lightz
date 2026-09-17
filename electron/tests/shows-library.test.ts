// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readdirSync, writeFileSync, utimesSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let docsDir: string

vi.mock('electron', () => ({
  app: { getPath: () => docsDir },
}))

const { listShows, saveNamedShow, deleteNamedShow, purgeOldDeletedShows, ensureShowsDir } = await import('../shows-library')

const config = {
  fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
  companionPort: 5551, devicePath: '', dmxOutputPort: 0 as const,
}

const showsDir = () => join(docsDir, 'Lightz')
const deletedDir = () => join(showsDir(), 'deleted')

beforeEach(() => {
  docsDir = mkdtempSync(join(tmpdir(), 'lightz-test-'))
})

afterEach(() => {
  rmSync(docsDir, { recursive: true, force: true })
})

describe('deleteNamedShow', () => {
  it('moves the show into the deleted folder instead of removing it', () => {
    saveNamedShow('Fall Tour', config)
    deleteNamedShow('Fall Tour')

    expect(existsSync(join(showsDir(), 'Fall Tour.json'))).toBe(false)
    expect(existsSync(join(deletedDir(), 'Fall Tour.json'))).toBe(true)
  })

  it('keeps both copies when a show of the same name is deleted twice', () => {
    saveNamedShow('Rehearsal', config)
    deleteNamedShow('Rehearsal')
    saveNamedShow('Rehearsal', config)
    deleteNamedShow('Rehearsal')

    expect(readdirSync(deletedDir())).toHaveLength(2)
  })

  it('leaves deleted shows out of the show list', () => {
    saveNamedShow('Gone', config)
    deleteNamedShow('Gone')

    expect(listShows().map((s) => s.name)).not.toContain('Gone')
  })
})

describe('purgeOldDeletedShows', () => {
  it('removes deleted shows older than 30 days and keeps newer ones', () => {
    saveNamedShow('Old', config)
    saveNamedShow('Recent', config)
    deleteNamedShow('Old')
    deleteNamedShow('Recent')

    const ancient = (Date.now() - 31 * 24 * 60 * 60 * 1000) / 1000
    utimesSync(join(deletedDir(), 'Old.json'), ancient, ancient)

    purgeOldDeletedShows()

    expect(existsSync(join(deletedDir(), 'Old.json'))).toBe(false)
    expect(existsSync(join(deletedDir(), 'Recent.json'))).toBe(true)
  })

  it('ignores non-json files', () => {
    saveNamedShow('Keep', config)
    deleteNamedShow('Keep')
    const note = join(deletedDir(), 'notes.txt')
    writeFileSync(note, 'hello')
    const ancient = (Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000
    utimesSync(note, ancient, ancient)

    purgeOldDeletedShows()

    expect(existsSync(note)).toBe(true)
  })

  it('does nothing when no show has been deleted yet', () => {
    ensureShowsDir()
    expect(() => purgeOldDeletedShows()).not.toThrow()
  })
})
