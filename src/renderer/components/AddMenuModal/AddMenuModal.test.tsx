import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddMenuModal } from './AddMenuModal'

describe('AddMenuModal', () => {
  it('calls onAddChannels when "Add Channels" is clicked', () => {
    const onAddChannels = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={onAddChannels}
        onAddCustomFixture={vi.fn()}
        onAddGroup={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Add Channels'))
    expect(onAddChannels).toHaveBeenCalled()
  })

  it('calls onAddCustomFixture when "Add Custom Fixture" is clicked', () => {
    const onAddCustomFixture = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={vi.fn()}
        onAddCustomFixture={onAddCustomFixture}
        onAddGroup={vi.fn()}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Add Custom Fixture'))
    expect(onAddCustomFixture).toHaveBeenCalled()
  })

  it('calls onAddGroup when "Add Group" is clicked', () => {
    const onAddGroup = vi.fn()
    render(
      <AddMenuModal
        onAddChannels={vi.fn()}
        onAddCustomFixture={vi.fn()}
        onAddGroup={onAddGroup}
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('+ Add Group'))
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
