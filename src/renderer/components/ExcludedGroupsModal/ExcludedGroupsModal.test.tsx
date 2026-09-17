import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExcludedGroupsModal } from './ExcludedGroupsModal'

describe('ExcludedGroupsModal', () => {
  const groupNames = ['Front Wash', 'Haze']

  const renderModal = (overrides: Partial<Parameters<typeof ExcludedGroupsModal>[0]> = {}) =>
    render(
      <ExcludedGroupsModal
        groupNames={groupNames}
        onSaveAnyway={vi.fn()}
        onEditScene={vi.fn()}
        onCancel={vi.fn()}
        {...overrides}
      />
    )

  it('lists the excluded group names', () => {
    renderModal()
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
    expect(screen.getByText('Haze')).toBeInTheDocument()
  })

  it('calls onSaveAnyway when Save Anyway is clicked', async () => {
    const onSaveAnyway = vi.fn()
    renderModal({ onSaveAnyway })
    await userEvent.click(screen.getByRole('button', { name: /save anyway/i }))
    expect(onSaveAnyway).toHaveBeenCalled()
  })

  it('calls onEditScene when Edit Scene is clicked', async () => {
    const onEditScene = vi.fn()
    renderModal({ onEditScene })
    await userEvent.click(screen.getByRole('button', { name: /edit scene/i }))
    expect(onEditScene).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    renderModal({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when the modal is closed via the close button', async () => {
    const onCancel = vi.fn()
    renderModal({ onCancel })
    await userEvent.click(screen.getByText('×'))
    expect(onCancel).toHaveBeenCalled()
  })
})
