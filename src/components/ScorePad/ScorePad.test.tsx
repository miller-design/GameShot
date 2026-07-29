/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ScorePad from './index'

afterEach(() => {
  cleanup()
})

describe('ScorePad', () => {
  it('rejects impossible three-dart totals while typing', () => {
    const onSubmit = vi.fn()
    render(<ScorePad onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    fireEvent.click(screen.getByRole('button', { name: '9' }))

    // 179 cannot be entered as a completed visit — third digit is rejected.
    expect(screen.getByLabelText('Score pad').textContent).toContain('17')
    expect(screen.getByLabelText('Score pad').textContent).not.toContain('179')
  })

  it('does not submit an impossible visit when prefilled in edit mode', () => {
    const onSubmit = vi.fn()
    render(
      <ScorePad
        mode="edit"
        prefillScore={179}
        onSubmit={onSubmit}
      />,
    )

    // Prefill shows 179 from history, but submit must still reject it.
    expect(screen.getByLabelText('Score pad').textContent).toContain('179')
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a legal visit total', () => {
    const onSubmit = vi.fn(() => true)
    render(<ScorePad onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: '6' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(onSubmit).toHaveBeenCalledWith(60)
  })

  it('ignores keyboard input while disabled (e.g. stats overlay open)', () => {
    const onSubmit = vi.fn()
    render(<ScorePad disabled onSubmit={onSubmit} />)

    fireEvent.keyDown(window, { key: '6' })
    fireEvent.keyDown(window, { key: '0' })
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Score pad').textContent).toContain(
      'Enter score',
    )
  })
})
