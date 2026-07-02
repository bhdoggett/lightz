// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddMultiChannelFixturesModal } from './AddMultiChannelFixturesModal'
import type { Fixture } from '../../../shared/types'

describe('AddMultiChannelFixturesModal', () => {
  const defaultProps = {
    templates: [],
    existingFixtures: [] as Fixture[],
    onApply: vi.fn(),
    onTemplateSave: vi.fn(),
    onTemplateDelete: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders the grid with no drafts initially, Add Fixture disabled', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    expect(screen.getByTitle('Channel 1')).toBeInTheDocument()
    expect(screen.getByText('Add Fixture')).toBeDisabled()
  })

  it('clicking a free cell creates a new draft card', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(screen.getByPlaceholderText('Fixture name')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 5 — click to remove')).toBeInTheDocument()
  })

  it('clicking a second free cell adds a second draft card', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByTitle('Channel 20'))
    expect(screen.getAllByPlaceholderText('Fixture name')).toHaveLength(2)
  })

  it('clicking the starting cell of a draft removes it', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByTitle('Channel 5 — click to remove'))
    expect(screen.queryByPlaceholderText('Fixture name')).not.toBeInTheDocument()
  })

  it('the Remove fixture button also removes the draft', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('Remove fixture'))
    expect(screen.queryByPlaceholderText('Fixture name')).not.toBeInTheDocument()
  })

  it('choosing a preset fills the channel rows for that draft', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGB'))
    expect(screen.getByDisplayValue('Red')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Green')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Blue')).toBeInTheDocument()
  })

  it('rejects a preset that would overflow into an existing fixture and shows a toast', () => {
    const existingFixtures: Fixture[] = [{
      id: 'f1', name: 'Existing', channel: 7, universe: 0, type: 'dimmer',
      channels: [{ id: 'c1', role: 'red', label: 'Red', channel: 7, universe: 0, linked: true }],
    }]
    render(<AddMultiChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGB'))
    expect(screen.getByText('Channel 7 is already in use.')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Red')).not.toBeInTheDocument()
  })

  it('rejects + Add Channel when the next channel is already taken and shows a toast', () => {
    const existingFixtures: Fixture[] = [{
      id: 'f1', name: 'Existing', channel: 7, universe: 0, type: 'dimmer',
      channels: [{ id: 'c1', role: 'red', label: 'Red', channel: 7, universe: 0, linked: true }],
    }]
    render(<AddMultiChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('+ Add channel'))
    expect(screen.queryByText(/already in use/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('+ Add channel'))
    expect(screen.getByText('Channel 7 is already in use.')).toBeInTheDocument()
  })

  it('a new draft starts with its first channel row already present, numbered at the start channel', () => {
    const { container } = render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    const channelNum = container.querySelector('[class*="channelNum"]')
    expect(channelNum).toHaveTextContent('5')
    expect(screen.getByDisplayValue('other')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ch 5')).toBeInTheDocument()
  })

  it('shows the conflict toast inside the affected draft card, not a shared banner above the drafts', () => {
    const existingFixtures: Fixture[] = [{
      id: 'f1', name: 'Existing', channel: 7, universe: 0, type: 'dimmer',
      channels: [{ id: 'c1', role: 'red', label: 'Red', channel: 7, universe: 0, linked: true }],
    }]
    render(<AddMultiChannelFixturesModal {...defaultProps} existingFixtures={existingFixtures} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGB'))
    const card = screen.getByText('Channel 7 is already in use.').closest('[class*="draftCard"]')
    expect(card).not.toBeNull()
  })

  it('a second draft cannot start on a channel claimed by an earlier draft', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGB'))
    fireEvent.click(screen.getByTitle('Channel 6'))
    expect(screen.getAllByPlaceholderText('Fixture name')).toHaveLength(1)
  })

  it('disables Add Fixture until every draft has a name and at least one channel', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(screen.getByText('Add Fixture')).toBeDisabled()
    fireEvent.click(screen.getByText('RGB'))
    expect(screen.getByText('Add Fixture')).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Wash 1' } })
    expect(screen.getByText('Add Fixture')).not.toBeDisabled()
  })

  it('label pluralizes to Add N Fixtures for multiple drafts', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'A' } })
    fireEvent.click(screen.getByText('RGB'))
    fireEvent.click(screen.getByTitle('Channel 20'))
    const nameInputs = screen.getAllByPlaceholderText('Fixture name')
    fireEvent.change(nameInputs[1], { target: { value: 'B' } })
    fireEvent.click(screen.getAllByText('RGB')[1])
    expect(screen.getByText('Add 2 Fixtures')).toBeInTheDocument()
  })

  it('calls onApply with one Fixture per draft, channels anchored at each draft\'s start', () => {
    const onApply = vi.fn()
    render(<AddMultiChannelFixturesModal {...defaultProps} onApply={onApply} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Wash 1' } })
    fireEvent.click(screen.getByText('RGB'))
    fireEvent.click(screen.getByText('Add Fixture'))
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Wash 1',
        channels: expect.arrayContaining([
          expect.objectContaining({ role: 'red', channel: 5 }),
          expect.objectContaining({ role: 'blue', channel: 7 }),
        ]),
      }),
    ])
  })

  it('switching universe clears all drafts', () => {
    render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(screen.getByPlaceholderText('Fixture name')).toBeInTheDocument()
    fireEvent.click(screen.getByText('U2'))
    expect(screen.queryByPlaceholderText('Fixture name')).not.toBeInTheDocument()
  })

  it('does not reuse a color between two concurrently open drafts after a removal', () => {
    const { container } = render(<AddMultiChannelFixturesModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByTitle('Channel 20'))
    fireEvent.click(screen.getByTitle('Channel 5 — click to remove'))
    fireEvent.click(screen.getByTitle('Channel 50'))
    const cards = container.querySelectorAll('[class*="draftCard"]')
    expect(cards).toHaveLength(2)
    const colors = Array.from(cards).map((el) => (el as HTMLElement).style.getPropertyValue('--draft-color'))
    expect(colors[0]).not.toBe(colors[1])
  })

  it('does not leak internal channel-row ids into saved templates', () => {
    const onTemplateSave = vi.fn()
    render(<AddMultiChannelFixturesModal {...defaultProps} onTemplateSave={onTemplateSave} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGB'))
    fireEvent.change(screen.getByPlaceholderText('Save as template…'), { target: { value: 'My RGB' } })
    fireEvent.click(screen.getByText('Save Template'))
    expect(onTemplateSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My RGB',
        channels: [
          { role: 'red', label: 'Red', linked: true, offset: 0 },
          { role: 'green', label: 'Green', linked: true, offset: 1 },
          { role: 'blue', label: 'Blue', linked: true, offset: 2 },
        ],
      })
    )
  })
})
