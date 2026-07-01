// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ApiProvider } from '../../api/context'
import { LaunchModal } from './LaunchModal'
import type { LightzApi } from '../../api/types'
import type { Config, ShowInfo } from '../../../shared/types'

const baseConfig: Config = {
  fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
  companionPort: 5551, devicePath: '', dmxOutputPort: 0,
}

function makeApi(overrides: Partial<LightzApi> = {}): LightzApi {
  return {
    getConfig: vi.fn(),
    setPort: vi.fn(), setDevicePath: vi.fn(), setDmxOutputPort: vi.fn(),
    setChannel: vi.fn(),
    saveScene: vi.fn(), loadScene: vi.fn(), deleteScene: vi.fn(),
    updateScene: vi.fn(), reorderScenes: vi.fn(),
    updateFixture: vi.fn(), deleteFixture: vi.fn(),
    saveFixtureTemplate: vi.fn(), deleteFixtureTemplate: vi.fn(),
    saveGroup: vi.fn(), deleteGroup: vi.fn(), reorderGroups: vi.fn(),
    setGroupOverrides: vi.fn(),
    resetShow: vi.fn().mockResolvedValue(baseConfig),
    listShows: vi.fn().mockResolvedValue([]),
    saveNamedShow: vi.fn(), loadNamedShow: vi.fn(),
    deleteNamedShow: vi.fn(), exportShow: vi.fn(), importShow: vi.fn(),
    listPorts: vi.fn(), openExternal: vi.fn(),
    onDmxStatus: vi.fn(), onDeviceAutoConnected: vi.fn(),
    onSceneActivated: vi.fn(), onMenuNewShow: vi.fn(),
    onMenuSaveShow: vi.fn(), onMenuOpenShows: vi.fn(),
    onMenuExportShow: vi.fn(), onMenuImportShow: vi.fn(),
    onMenuViewFull: vi.fn(), onMenuViewCustom: vi.fn(),
    onMenuAllOff: vi.fn(), onMenuOpenSettings: vi.fn(),
    onMenuSaveScene: vi.fn(), onMenuAddScene: vi.fn(),
    onMenuAddChannels: vi.fn(), onMenuAddFixture: vi.fn(),
    onMenuAddGroup: vi.fn(),
    ...overrides,
  }
}

function renderModal(api: LightzApi, onNew = vi.fn(), onLoad = vi.fn()) {
  return render(
    <ApiProvider api={api}>
      <LaunchModal onNew={onNew} onLoad={onLoad} />
    </ApiProvider>
  )
}

describe('LaunchModal', () => {
  it('renders New Show button', async () => {
    renderModal(makeApi())
    expect(screen.getByText(/new show/i)).toBeTruthy()
  })

  it('has no close button', async () => {
    renderModal(makeApi())
    expect(screen.queryByText('×')).toBeNull()
  })

  it('shows saved show names from listShows', async () => {
    const shows: ShowInfo[] = [
      { name: 'Main Stage', modifiedAt: Date.now() },
      { name: 'Rehearsal', modifiedAt: Date.now() },
    ]
    renderModal(makeApi({ listShows: vi.fn().mockResolvedValue(shows) }))
    await waitFor(() => {
      expect(screen.getByText('Main Stage')).toBeTruthy()
      expect(screen.getByText('Rehearsal')).toBeTruthy()
    })
  })

  it('clicking New Show calls resetShow then onNew', async () => {
    const onNew = vi.fn()
    const api = makeApi()
    renderModal(api, onNew)
    fireEvent.click(screen.getByText(/new show/i))
    await waitFor(() => {
      expect(api.resetShow).toHaveBeenCalled()
      expect(onNew).toHaveBeenCalledWith(baseConfig)
    })
  })

  it('clicking a show name calls loadNamedShow then onLoad', async () => {
    const onLoad = vi.fn()
    const shows: ShowInfo[] = [{ name: 'Main Stage', modifiedAt: Date.now() }]
    const api = makeApi({
      listShows: vi.fn().mockResolvedValue(shows),
      loadNamedShow: vi.fn().mockResolvedValue(baseConfig),
    })
    renderModal(api, vi.fn(), onLoad)
    await waitFor(() => screen.getByText('Main Stage'))
    fireEvent.click(screen.getByText('Main Stage'))
    await waitFor(() => {
      expect(api.loadNamedShow).toHaveBeenCalledWith('Main Stage')
      expect(onLoad).toHaveBeenCalledWith(baseConfig, 'Main Stage')
    })
  })

  it('shows empty state when no shows exist', async () => {
    renderModal(makeApi({ listShows: vi.fn().mockResolvedValue([]) }))
    await waitFor(() => {
      expect(screen.getByText(/no saved shows/i)).toBeTruthy()
    })
  })
})
