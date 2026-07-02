// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useDragReorder } from './useDragReorder'

interface Item {
  id: string
}

const items: Item[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

function makeDragOverEvent(clientX: number, dragIdEls: HTMLElement[]) {
  const container = document.createElement('div')
  dragIdEls.forEach((el) => container.appendChild(el))
  return {
    preventDefault: vi.fn(),
    dataTransfer: { dropEffect: '' } as unknown as DataTransfer,
    clientX,
    currentTarget: container,
  } as unknown as React.DragEvent<HTMLDivElement>
}

function makeDropEvent(sourceId: string | null) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      getData: () => sourceId ?? '',
    } as unknown as DataTransfer,
  } as unknown as React.DragEvent<HTMLDivElement>
}

function elAt(left: number, width: number, id: string) {
  const el = document.createElement('div')
  el.setAttribute('data-drag-id', id)
  el.getBoundingClientRect = () => ({ left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => {} })
  return el
}

describe('useDragReorder', () => {
  it('itemProps sets dragId and dataTransfer on dragstart', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { effectAllowed: '', setData: vi.fn() } as unknown as DataTransfer,
    } as unknown as React.DragEvent<HTMLElement>

    act(() => {
      result.current.itemProps('b').onMouseDown({ target: document.createElement('div') } as unknown as React.MouseEvent<HTMLElement>)
      result.current.itemProps('b').onDragStart(dragEvent)
    })

    expect(result.current.dragId).toBe('b')
    expect(dragEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'b')
  })

  it('onMouseDown on an input prevents dragstart', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const input = document.createElement('input')
    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { effectAllowed: '', setData: vi.fn() } as unknown as DataTransfer,
    } as unknown as React.DragEvent<HTMLElement>

    act(() => {
      result.current.itemProps('b').onMouseDown({ target: input } as unknown as React.MouseEvent<HTMLElement>)
      result.current.itemProps('b').onDragStart(dragEvent)
    })

    expect(dragEvent.preventDefault).toHaveBeenCalled()
    expect(result.current.dragId).toBeNull()
  })

  it('containerProps.onDragOver sets insertIndex based on cursor position', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.containerProps.onDragOver(makeDragOverEvent(120, els))
    })

    // clientX=120 is left of b's midpoint (150), so insert before b (index 1)
    expect(result.current.insertIndex).toBe(1)
  })

  it('containerProps.onDragOver sets insertIndex to items.length when cursor is past all items', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.containerProps.onDragOver(makeDragOverEvent(500, els))
    })

    expect(result.current.insertIndex).toBe(3)
  })

  it('onDrop reorders items and calls onReorder', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.containerProps.onDragOver(makeDragOverEvent(500, els)) // past all items: insert at end (index 3)
    })
    act(() => {
      result.current.containerProps.onDrop(makeDropEvent('a'))
    })

    expect(onReorder).toHaveBeenCalledWith([{ id: 'b' }, { id: 'c' }, { id: 'a' }])
  })

  it('onDrop resets dragId and insertIndex after a successful reorder', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.itemProps('a').onMouseDown({ target: document.createElement('div') } as unknown as React.MouseEvent<HTMLElement>)
      result.current.itemProps('a').onDragStart({
        preventDefault: vi.fn(),
        dataTransfer: { effectAllowed: '', setData: vi.fn() } as unknown as DataTransfer,
      } as unknown as React.DragEvent<HTMLElement>)
      result.current.containerProps.onDragOver(makeDragOverEvent(500, els))
    })
    expect(result.current.dragId).toBe('a')
    expect(result.current.insertIndex).toBe(3)

    act(() => {
      result.current.containerProps.onDrop(makeDropEvent('a'))
    })

    expect(result.current.dragId).toBeNull()
    expect(result.current.insertIndex).toBeNull()
  })

  it('onDrop resets insertIndex even when the dropped id is not among items (a no-op/external drop)', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.containerProps.onDragOver(makeDragOverEvent(120, els))
    })
    expect(result.current.insertIndex).toBe(1)

    act(() => {
      result.current.containerProps.onDrop(makeDropEvent('not-an-item'))
    })

    expect(result.current.insertIndex).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('onDrop is a no-op when insertIndex was never set', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))

    act(() => {
      result.current.containerProps.onDrop(makeDropEvent('a'))
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.dragId).toBeNull()
    expect(result.current.insertIndex).toBeNull()
  })

  it('containerProps.onDragLeave clears insertIndex when leaving the container entirely', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragReorder(items, onReorder))
    const els = [elAt(0, 100, 'a'), elAt(100, 100, 'b'), elAt(200, 100, 'c')]

    act(() => {
      result.current.containerProps.onDragOver(makeDragOverEvent(120, els))
    })
    expect(result.current.insertIndex).toBe(1)

    act(() => {
      result.current.containerProps.onDragLeave({
        currentTarget: { contains: () => false } as unknown as HTMLDivElement,
        relatedTarget: null,
      } as unknown as React.DragEvent<HTMLDivElement>)
    })

    expect(result.current.insertIndex).toBeNull()
  })
})
