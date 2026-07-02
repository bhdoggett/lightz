// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateFixtureModal } from './CreateFixtureModal'
import type { Fixture } from '../../../shared/types'

describe('CreateFixtureModal', () => {
  const defaultProps = {
    templates: [],
    existingFixtures: [] as Fixture[],
    onApply: vi.fn(),
    onTemplateSave: vi.fn(),
    onTemplateDelete: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders name input and channel grid on a single screen', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    expect(screen.getByPlaceholderText('Fixture name')).toBeInTheDocument()
    expect(screen.getByText('Starting channel — click to select')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 1')).toBeInTheDocument()
  })

  it('clicking a channel cell and a preset shows the matching channel rows', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGBAW+UV'))
    expect(screen.getByDisplayValue('Red')).toBeInTheDocument()
    expect(screen.getByDisplayValue('UV')).toBeInTheDocument()
  })

  it('calls onApply with channels anchored at the clicked starting channel', () => {
    const onApply = vi.fn()
    render(<CreateFixtureModal {...defaultProps} onApply={onApply} />)
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Q6' } })
    fireEvent.click(screen.getByTitle('Channel 5'))
    fireEvent.click(screen.getByText('RGBAW+UV'))
    fireEvent.click(screen.getByText('Add Fixture'))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Q6',
        channels: expect.arrayContaining([
          expect.objectContaining({ role: 'red', channel: 5 }),
          expect.objectContaining({ role: 'uv', channel: 10 }),
        ]),
      })
    )
  })

  it('greys out and disables channels already used by another fixture', () => {
    const existingFixtures: Fixture[] = [{
      id: 'f1', name: 'Existing', channel: 3, universe: 0, type: 'dimmer',
      channels: [{ id: 'c1', role: 'red', label: 'Red', channel: 3, universe: 0, linked: true }],
    }]
    render(<CreateFixtureModal {...defaultProps} existingFixtures={existingFixtures} />)
    const usedCell = screen.getByTitle('Channel 3 unavailable')
    expect(usedCell.className).toMatch(/unavailable/)
    fireEvent.click(usedCell)
    expect(usedCell.className).not.toMatch(/selected/)
  })

  it('disables Add Fixture until name, starting channel, and a layout are all set', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    const addBtn = screen.getByText('Add Fixture') as HTMLButtonElement
    expect(addBtn).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Q6' } })
    expect(addBtn).toBeDisabled()
    fireEvent.click(screen.getByTitle('Channel 5'))
    expect(addBtn).toBeDisabled()
    fireEvent.click(screen.getByText('RGB'))
    expect(addBtn).not.toBeDisabled()
  })
})
