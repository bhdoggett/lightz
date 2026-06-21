// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createCompanionServer } from './server'
import type { Scene } from '../src/shared/types'
import type { Server } from 'http'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: { f1: 200 } },
  { id: 'full-bright', name: 'Full Bright', fadeDuration: 0, values: { f1: 255 } },
]

const onActivate = vi.fn()
let server: Server

beforeAll(() => {
  const app = createCompanionServer(() => scenes, onActivate)
  server = app.listen(0)
})

afterAll(() => server.close())

describe('GET /scenes', () => {
  it('returns scene list', async () => {
    const res = await request(server).get('/scenes')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { id: 'worship-mode', name: 'Worship Mode' },
      { id: 'full-bright', name: 'Full Bright' },
    ])
  })
})

describe('POST /scenes/:id/activate', () => {
  it('activates an existing scene', async () => {
    const res = await request(server).post('/scenes/worship-mode/activate')
    expect(res.status).toBe(200)
    expect(onActivate).toHaveBeenCalledWith('worship-mode')
  })

  it('returns 404 for unknown scene', async () => {
    const res = await request(server).post('/scenes/not-real/activate')
    expect(res.status).toBe(404)
  })
})

describe('GET /status', () => {
  it('returns ok', async () => {
    const res = await request(server).get('/status')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
