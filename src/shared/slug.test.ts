import { describe, it, expect } from 'vitest'
import { makeSceneId, sceneNameTaken } from './slug'
import type { Scene } from './types'

describe('makeSceneId', () => {
  it('converts name to url-safe slug', () => {
    expect(makeSceneId('Worship Mode')).toBe('worship-mode')
  })

  it('strips special characters', () => {
    expect(makeSceneId('Full Bright!')).toBe('full-bright')
  })

  it('handles empty name gracefully', () => {
    expect(makeSceneId('')).toBe('scene')
  })
})

describe('sceneNameTaken', () => {
  const otherScenes: Scene[] = [
    { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 0, values: {} },
    { id: 'full-bright', name: 'Full Bright', fadeDuration: 0, values: {} },
  ]

  it('returns true when the name slugifies to an existing scene id', () => {
    expect(sceneNameTaken('Worship Mode', otherScenes)).toBe(true)
  })

  it('returns true for a differently-punctuated name that collides on slug', () => {
    expect(sceneNameTaken('worship-mode', otherScenes)).toBe(true)
  })

  it('returns false for a name that does not collide', () => {
    expect(sceneNameTaken('Dim', otherScenes)).toBe(false)
  })

  it('returns false against an empty list', () => {
    expect(sceneNameTaken('Worship Mode', [])).toBe(false)
  })
})
