// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChannelGrid } from './ChannelGrid'

describe('ChannelGrid', () => {
  it('renders the label and all 512 channel cells', () => {
    render(
      <ChannelGrid
        label="Click a free channel"
        onCellClick={vi.fn()}
        getCell={(ch) => ({ title: `Channel ${ch}` })}
      />
    )
    expect(screen.getByText('Click a free channel')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 1')).toBeInTheDocument()
    expect(screen.getByTitle('Channel 512')).toBeInTheDocument()
  })

  it('calls onCellClick with the clicked channel number', () => {
    const onCellClick = vi.fn()
    render(
      <ChannelGrid
        label="label"
        onCellClick={onCellClick}
        getCell={(ch) => ({ title: `Channel ${ch}` })}
      />
    )
    fireEvent.click(screen.getByTitle('Channel 42'))
    expect(onCellClick).toHaveBeenCalledWith(42)
  })

  it('applies the className and style returned by getCell for a given channel', () => {
    render(
      <ChannelGrid
        label="label"
        onCellClick={vi.fn()}
        getCell={(ch) => ch === 7
          ? { className: 'my-marker', style: { '--x': 'red' } as React.CSSProperties, title: 'Channel 7' }
          : { title: `Channel ${ch}` }}
      />
    )
    const cell = screen.getByTitle('Channel 7')
    expect(cell.className).toContain('my-marker')
    expect(cell.style.getPropertyValue('--x')).toBe('red')
  })
})
