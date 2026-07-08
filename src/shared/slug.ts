import slugify from 'slugify'
import type { Scene } from './types'

export function makeSceneId(name: string): string {
  return slugify(name, { lower: true, strict: true }) || 'scene'
}

export function sceneNameTaken(name: string, otherScenes: Scene[]): boolean {
  const id = makeSceneId(name)
  return otherScenes.some((s) => s.id === id)
}
