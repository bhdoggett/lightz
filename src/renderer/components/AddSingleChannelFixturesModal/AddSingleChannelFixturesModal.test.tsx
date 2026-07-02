// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddSingleChannelFixturesModal } from './AddSingleChannelFixturesModal'
import type { Fixture } from '../../../shared/types'

describe('AddSingleChannelFixturesModal', () => {
  const defaultProps = {
    existingFixtures: [] as Fixture[],
    onApply: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders the grid with Add Fixture disabled when nothing is selected', () => {
    render(<AddSingleChannelFixturesModal {...defaultProps} />)
    expect(screen.getByTitle('Channel 1')).toBeInTheDocument()
    expect(screen.getByText('Add Fixture')).toBeDisabled()
  })

  it('clicking a free channel selects it and enables Add Fixture', () => {
    render(<AddSingleChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(screen.getByText('Add Fixture')).not.toBeDisabled()
  })

  it('greys out a channel already used by a single-channel fixture and blocks selection', () => {
    const existingFixtures: Fixture[] = [
      { id: 'a', name: 'Existing', channel: 5, universe: 0, type: 'dimmer' },
    ]
    render(<AddSingleChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    expect(screen.getByTitle('Channel 5 unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Channel 5 unavailable'))
    expect(screen.getByText('Add Fixture')).toBeDisabled()
  })

  it('greys out every channel spanned by a multi-channel fixture and blocks selection', () => {
    const existingFixtures: Fixture[] = [{
      id: 'a', name: 'Wash', channel: 10, universe: 0, type: 'dimmer',
      channels: [
        { id: 'c1', role: 'red', label: 'Red', channel: 10, universe: 0, linked: true },
        { id: 'c2', role: 'green', label: 'Green', channel: 11, universe: 0, linked: true },
        { id: 'c3', role: 'blue', label: 'Blue', channel: 12, universe: 0, linked: true },
      ],
    }]
    render(<AddSingleChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    expect(screen.getByTitle('Channel 10 unavailable')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 11 unavailable')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 12 unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Channel 11 unavailable'))
    expect(screen.getByText('Add Fixture')).toBeDisabled()
  })

  it('a range that overlaps used channels only selects the free ones', () => {
    const existingFixtures: Fixture[] = [{
      id: 'a', name: 'Wash', channel: 10, universe: 0, type: 'dimmer',
      channels: [
        { id: 'c1', role: 'red', label: 'Red', channel: 10, universe: 0, linked: true },
        { id: 'c2', role: 'green', label: 'Green', channel: 11, universe: 0, linked: true },
      ],
    }]
    render(<AddSingleChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. 1-8 or 1,3,5 or 1-4,7,9-12'), { target: { value: '9-12' } })
    fireEvent.click(screen.getByText('Select'))
    expect(screen.getByText('Add 2 Fixtures')).toBeInTheDocument()
  })

  it('clicking the starting channel of an existing fixture does not remove it', () => {
    const existingFixtures: Fixture[] = [
      { id: 'a', name: 'Existing', channel: 5, universe: 0, type: 'dimmer' },
    ]
    const onApply = vi.fn()
    render(<AddSingleChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} onApply={onApply} />)
    fireEvent.click(screen.getByTitle('Channel 5 unavailable'))
    fireEvent.click(screen.getByTitle('Channel 20'))
    fireEvent.click(screen.getByText('Add Fixture'))
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({ channel: 20 }),
    ])
  })

  it('switching universe clears the current selection', () => {
    render(<AddSingleChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(screen.getByText('Add Fixture')).not.toBeDisabled()
    fireEvent.click(screen.getByText('U2'))
    expect(screen.getByText('Add Fixture')).toBeDisabled()
  })

  it('calls onApply with only newly selected channels, using entered names', () => {
    const onApply = vi.fn()
    render(<AddSingleChannelFixturesModal {...defaultProps} onApply={onApply} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.change(screen.getByPlaceholderText('Ch 005'), { target: { value: 'Front Wash' } })
    fireEvent.click(screen.getByText('Add Fixture'))
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Front Wash', channel: 5, universe: 0 }),
    ])
  })
})
