import { describe, it, expect, vi } from 'vitest'
import { createWebApi } from './web-provider'
import { demoConfig } from './demo-config'

function makeCallbacks() {
  return {
    setChannel: vi.fn(),
    getChannelValue: vi.fn().mockReturnValue(0),
  }
}

describe('createWebApi', () => {
  it('returns demo config on getConfig', async () => {
    const api = createWebApi(makeCallbacks())
    const config = await api.getConfig()
    expect(config.fixtures.length).toBeGreaterThan(0)
    expect(config.scenes.length).toBeGreaterThan(0)
  })

  it('setChannel delegates to callback', async () => {
    const cbs = makeCallbacks()
    const api = createWebApi(cbs)
    await api.setChannel({ universe: 0, channel: 1, value: 128 })
    expect(cbs.setChannel).toHaveBeenCalledWith(0, 1, 128)
  })

  it('saveScene adds a scene and returns it', async () => {
    const api = createWebApi(makeCallbacks())
    const scene = await api.saveScene({ name: 'Test', fadeDuration: 1000, values: { 'a': 100 } })
    expect(scene.name).toBe('Test')
    expect(scene.id).toBeTruthy()
    const config = await api.getConfig()
    expect(config.scenes.find(s => s.name === 'Test')).toBeTruthy()
  })

  it('deleteScene removes a scene', async () => {
    const api = createWebApi(makeCallbacks())
    const config = await api.getConfig()
    const firstId = config.scenes[0].id
    await api.deleteScene(firstId)
    const updated = await api.getConfig()
    expect(updated.scenes.find(s => s.id === firstId)).toBeUndefined()
  })

  it('resetShow restores demo config', async () => {
    const api = createWebApi(makeCallbacks())
    await api.deleteScene((await api.getConfig()).scenes[0].id)
    const reset = await api.resetShow()
    expect(reset.scenes.length).toBe(demoConfig.scenes.length)
  })

  it('listPorts returns empty array', async () => {
    const api = createWebApi(makeCallbacks())
    expect(await api.listPorts()).toEqual([])
  })

  it('menu listeners are callable no-ops', () => {
    const api = createWebApi(makeCallbacks())
    expect(() => api.onMenuNewShow(() => {})).not.toThrow()
    expect(() => api.onMenuAllOff(() => {})).not.toThrow()
  })
})
