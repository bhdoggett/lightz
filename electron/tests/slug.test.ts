// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { makeSceneId } from './slug'

describe('makeSceneId', () => {
  it('converts name to url-safe slug', () => {
    expect(makeSceneId('Worship Mode', [])).toBe('worship-mode')
  })

  it('strips special characters', () => {
    expect(makeSceneId('Full Bright!', [])).toBe('full-bright')
  })

  it('deduplicates against existing ids', () => {
    expect(makeSceneId('Worship Mode', ['worship-mode'])).toBe('worship-mode-2')
  })

  it('increments suffix further when needed', () => {
    expect(makeSceneId('Dim', ['dim', 'dim-2'])).toBe('dim-3')
  })

  it('handles empty name gracefully', () => {
    expect(makeSceneId('', [])).toBe('scene')
  })
})
