// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateFixtureModal } from './CreateFixtureModal'

describe('CreateFixtureModal', () => {
  const defaultProps = {
    templates: [],
    existingFixtures: [],
    onApply: vi.fn(),
    onTemplateSave: vi.fn(),
    onTemplateDelete: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders step 1 fields', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    expect(screen.getByPlaceholderText('Fixture name')).toBeTruthy()
    expect(screen.getByLabelText(/starting channel/i)).toBeTruthy()
  })

  it('advances to step 2 after filling name and channel', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Q6' } })
    fireEvent.change(screen.getByLabelText(/starting channel/i), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('RGBAW+UV')).toBeTruthy()
  })

  it('selecting RGBAW+UV preset fills 6 channel rows', () => {
    render(<CreateFixtureModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Q6' } })
    fireEvent.change(screen.getByLabelText(/starting channel/i), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('RGBAW+UV'))
    expect(screen.getByDisplayValue('Red')).toBeTruthy()
    expect(screen.getByDisplayValue('UV')).toBeTruthy()
  })

  it('calls onApply with correct fixture on confirm', () => {
    const onApply = vi.fn()
    render(<CreateFixtureModal {...defaultProps} onApply={onApply} />)
    fireEvent.change(screen.getByPlaceholderText('Fixture name'), { target: { value: 'Q6' } })
    fireEvent.change(screen.getByLabelText(/starting channel/i), { target: { value: '5' } })
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('RGBAW+UV'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Add Fixture'))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Q6',
        channels: expect.arrayContaining([
          expect.objectContaining({ role: 'red', channel: 5 }),
          expect.objectContaining({ role: 'uv',  channel: 10 }),
        ]),
      })
    )
  })
})
