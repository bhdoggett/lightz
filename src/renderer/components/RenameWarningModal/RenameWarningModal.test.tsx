import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RenameWarningModal } from './RenameWarningModal'

describe('RenameWarningModal', () => {
  const oldUrl = 'http://localhost:5551/scenes/warm-wash/activate'
  const newUrl = 'http://localhost:5551/scenes/warm-wash-2/activate'

  it('shows the old and new endpoint URLs', () => {
    render(<RenameWarningModal oldUrl={oldUrl} newUrl={newUrl} onAccept={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(`POST ${oldUrl}`)).toBeInTheDocument()
    expect(screen.getByText(`POST ${newUrl}`)).toBeInTheDocument()
  })

  it('calls onAccept when Accept is clicked', async () => {
    const onAccept = vi.fn()
    render(<RenameWarningModal oldUrl={oldUrl} newUrl={newUrl} onAccept={onAccept} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^accept$/i }))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(<RenameWarningModal oldUrl={oldUrl} newUrl={newUrl} onAccept={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when the modal is closed via the close button', async () => {
    const onCancel = vi.fn()
    render(<RenameWarningModal oldUrl={oldUrl} newUrl={newUrl} onAccept={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByText('×'))
    expect(onCancel).toHaveBeenCalled()
  })
})
