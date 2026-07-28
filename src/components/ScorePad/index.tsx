import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'

import { isValidVisitScore } from '#/lib/darts/scoring'

import styles from './styles.module.css'

type ScorePadProps = {
  disabled?: boolean
  onSubmit: (scored: number) => void
  className?: string
}

/**
 * Touch-first numeric score pad with desktop keyboard support.
 *
 * @param props.disabled - Disables input (e.g. during leg-complete overlay)
 * @param props.onSubmit - Called with a validated visit score 0–180
 * @param props.className - Optional class on the pad root
 *
 * @example
 * <ScorePad onSubmit={(n) => submitVisit(n)} />
 */
const ScorePad = ({ disabled = false, onSubmit, className }: ScorePadProps) => {
  const [buffer, setBuffer] = useState('')

  /**
   * Appends a digit to the score buffer (max 3 digits / 180).
   *
   * @param digit - Single digit character
   *
   * @example
   * appendDigit('6')
   */
  const appendDigit = useCallback(
    (digit: string) => {
      if (disabled) return
      setBuffer((prev) => {
        const next = `${prev}${digit}`
        if (next.length > 3) return prev
        const value = Number(next)
        if (value > 180) return prev
        return next
      })
    },
    [disabled],
  )

  /**
   * Removes the last digit from the buffer.
   *
   * @example
   * backspace()
   */
  const backspace = useCallback(() => {
    if (disabled) return
    setBuffer((prev) => prev.slice(0, -1))
  }, [disabled])

  /**
   * Clears the entire buffer.
   *
   * @example
   * clear()
   */
  const clear = useCallback(() => {
    if (disabled) return
    setBuffer('')
  }, [disabled])

  /**
   * Submits the buffered score if valid.
   *
   * @example
   * submit()
   */
  const submit = useCallback(() => {
    if (disabled) return
    if (buffer === '') return
    const value = Number(buffer)
    if (!isValidVisitScore(value)) return
    onSubmit(value)
    setBuffer('')
  }, [buffer, disabled, onSubmit])

  useEffect(() => {
    /**
     * Handles physical keyboard input on desktop.
     *
     * @param event - Keyboard event
     */
    function onKeyDown(event: KeyboardEvent) {
      if (disabled) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        appendDigit(event.key)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        clear()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [appendDigit, backspace, clear, disabled, submit])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

  return (
    <div className={clsx(styles.root, className)} aria-label="Score pad">
      <div className={styles.display} aria-live="polite">
        {buffer === '' ? <span className={styles.placeholder}>Enter score</span> : buffer}
      </div>

      <div className={styles.grid}>
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.key}
            disabled={disabled}
            onClick={() => appendDigit(key)}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={clear}
          aria-label="Clear"
        >
          C
        </button>
        <button
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={() => appendDigit('0')}
        >
          0
        </button>
        <button
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={backspace}
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        className={styles.submit}
        disabled={disabled || buffer === ''}
        onClick={submit}
      >
        Submit
      </button>
    </div>
  )
}

export default ScorePad
