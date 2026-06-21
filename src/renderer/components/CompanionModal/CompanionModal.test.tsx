import { render, screen } from '@testing-library/react'
import { CompanionModal } from './CompanionModal'
import { ApiProvider } from '../api/context'
import type { LightzApi } from '../api/types'
import type { Scene } from '../../shared/types'
import type { ReactNode } from 'react'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: {} },
]

const mockListPorts = vi.fn().mockResolvedValue([])

function makeMockApi(overrides?: Partial<LightzApi>): LightzApi {
  return {
    getConfig: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    setChannel: async () => {},
    saveScene: async (args) => ({ id: 'test', name: args.name, fadeDuration: args.fadeDuration, values: args.values }),
    loadScene: async () => {},
    deleteScene: async () => {},
    updateScene: async () => null,
    reorderScenes: async () => {},
    updateFixture: async (f) => f,
    deleteFixture: async () => {},
    saveFixtureTemplate: async () => [],
    deleteFixtureTemplate: async () => [],
    saveGroup: async () => [],
    deleteGroup: async () => {},
    reorderGroups: async () => {},
    setGroupOverrides: async () => {},
    resetShow: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    listShows: async () => [],
    saveNamedShow: async () => [],
    loadNamedShow: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    deleteNamedShow: async () => [],
    exportShow: async () => {},
    importShow: async () => null,
    setPort: async () => {},
    setDevicePath: async () => {},
    setDmxOutputPort: async () => {},
    listPorts: mockListPorts,
    openExternal: async () => {},
    onDmxStatus: () => {},
    onDeviceAutoConnected: () => {},
    onSceneActivated: () => {},
    onMenuNewShow: () => {},
    onMenuSaveShow: () => {},
    onMenuOpenShows: () => {},
    onMenuExportShow: () => {},
    onMenuImportShow: () => {},
    onMenuViewFull: () => {},
    onMenuViewCustom: () => {},
    onMenuAllOff: () => {},
    onMenuOpenSettings: () => {},
    onMenuSaveScene: () => {},
    onMenuAddScene: () => {},
    onMenuAddChannels: () => {},
    onMenuAddFixture: () => {},
    onMenuAddGroup: () => {},
    ...overrides,
  }
}

const defaultProps = {
  scenes,
  port: 3000,
  devicePath: '',
  ports: [],
  dmxOutputPort: 0 as const,
  onPortChange: vi.fn(),
  onDevicePathChange: vi.fn(),
  onDmxOutputPortChange: vi.fn(),
  onClose: vi.fn(),
}

function renderWithApi(ui: ReactNode, overrides?: Partial<LightzApi>) {
  const api = makeMockApi(overrides)
  return render(<ApiProvider api={api}>{ui}</ApiProvider>)
}

describe('CompanionModal', () => {
  beforeEach(() => {
    mockListPorts.mockClear()
    mockListPorts.mockResolvedValue([])
  })

  it('shows the companion port', () => {
    renderWithApi(<CompanionModal {...defaultProps} />)
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument()
  })

  it('shows scene endpoint for each scene', () => {
    renderWithApi(<CompanionModal {...defaultProps} />)
    expect(screen.getByText(/worship-mode/)).toBeInTheDocument()
  })

  it('shows setup instructions', () => {
    renderWithApi(<CompanionModal {...defaultProps} />)
    expect(screen.getAllByText(/companion/i).length).toBeGreaterThan(0)
  })

  it('shows device path input', () => {
    renderWithApi(<CompanionModal {...defaultProps} devicePath="/dev/tty.usbserial-123" />)
    expect(screen.getByDisplayValue('/dev/tty.usbserial-123')).toBeInTheDocument()
  })

  it('renders detected ports as clickable options', async () => {
    mockListPorts.mockResolvedValue([
      '/dev/cu.usbmodem123',
      '/dev/cu.usbserial-ABC',
    ])
    renderWithApi(
      <CompanionModal
        {...defaultProps}
        ports={['/dev/cu.usbmodem123', '/dev/cu.usbserial-ABC']}
      />
    )
    await screen.findByText('/dev/cu.usbmodem123')
    expect(screen.getByText('/dev/cu.usbserial-ABC')).toBeInTheDocument()
  })

  it('shows empty message when no ports detected', async () => {
    mockListPorts.mockResolvedValue([])
    renderWithApi(<CompanionModal {...defaultProps} ports={[]} />)
    expect(await screen.findByText(/no usb serial devices found/i)).toBeInTheDocument()
  })
})
