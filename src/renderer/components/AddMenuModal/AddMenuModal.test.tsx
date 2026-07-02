import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddMenuModal } from './AddMenuModal'

describe('AddMenuModal', () => {
  it('calls onAddChannels when "Single-Channel Fixtures" is clicked', () => {
    const onAddChannels = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={onAddChannels}
        onAddCustomFixture={vi.fn()}
        onAddGroup={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Single-Channel Fixtures'))
    expect(onAddChannels).toHaveBeenCalled()
  })

  it('calls onAddCustomFixture when "Multi-Channel Fixtures" is clicked', () => {
    const onAddCustomFixture = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={vi.fn()}
        onAddCustomFixture={onAddCustomFixture}
        onAddGroup={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Multi-Channel Fixtures'))
    expect(onAddCustomFixture).toHaveBeenCalled()
  })

  it('calls onAddGroup when "Fixture Group" is clicked', () => {
    const onAddGroup = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={vi.fn()}
        onAddCustomFixture={vi.fn()}
        onAddGroup={onAddGroup}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Fixture Group'))
    expect(onAddGroup).toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={vi.fn()}
        onAddCustomFixture={vi.fn()}
        onAddGroup={vi.fn()}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })
})
