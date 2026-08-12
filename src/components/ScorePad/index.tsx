import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'

import { isValidVisitScore } from '#/lib/darts/scoring'

import styles from './styles.module.css'

/**
 * Renders the backspace icon for the score keypad.
 *
 * @example
 * <button aria-label="Backspace"><BackspaceIcon /></button>
 */
const BackspaceIcon = () => {
  return (
    <svg
      className={styles.backspaceIcon}
      fill="currentColor"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.6 2.5H4.49a1.25 1.25 0 0 0-1 .51L.39 7.26a1.26 1.26 0 0 0 0 1.48L3.48 13a1.26 1.26 0 0 0 1 .51H14.6a1.25 1.25 0 0 0 1.25-1.25V3.75A1.25 1.25 0 0 0 14.6 2.5zm0 9.75H4.49L1.4 8l3.09-4.25H14.6z" />
      <path d="m7.86 10.55 1.99-1.72 1.99 1.72.82-.94L10.81 8l1.85-1.61-.82-.94-1.99 1.72-1.99-1.72-.82.94L8.9 8 7.04 9.61l.82.94z" />
    </svg>
  )
}

type ScorePadProps = {
  disabled?: boolean
  onSubmit: (scored: number) => void | boolean
  className?: string
  mode?: 'entry' | 'edit'
  prefillScore?: number | null
  errorMessage?: string | null
  onBufferChange?: (buffer: string) => void
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
const ScorePad = ({
  disabled = false,
  onSubmit,
  className,
  mode = 'entry',
  prefillScore = null,
  errorMessage = null,
  onBufferChange,
}: ScorePadProps) => {
  const isEdit = mode === 'edit'
  const prefillStr = prefillScore === null ? '' : String(prefillScore)
  const modeSyncKey = `${mode}:${prefillStr}`

  const [buffer, setBuffer] = useState(() =>
    isEdit && prefillScore !== null ? prefillStr : '',
  )
  const [replaceNextDigit, setReplaceNextDigit] = useState(
    () => isEdit && prefillScore !== null,
  )
  const [syncedModeKey, setSyncedModeKey] = useState(modeSyncKey)
  const onBufferChangeRef = useRef(onBufferChange)
  onBufferChangeRef.current = onBufferChange

  // Keep buffer in sync with mode/prefill before paint so the display never
  // flashes the empty "Enter score" / "Edit score" placeholder.
  if (syncedModeKey !== modeSyncKey) {
    setSyncedModeKey(modeSyncKey)
    if (!isEdit || prefillScore === null) {
      setBuffer('')
      setReplaceNextDigit(false)
    } else {
      setBuffer(prefillStr)
      setReplaceNextDigit(true)
    }
  }

  // Sync only when the buffer value changes — not when the parent callback identity changes,
  // which would re-push a stale edit prefill into entry preview for one frame.
  useEffect(() => {
    onBufferChangeRef.current?.(buffer)
  }, [buffer])

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
      const shouldReplace = isEdit && prefillScore !== null && replaceNextDigit
      setReplaceNextDigit(false)
      setBuffer((prev) => {
        const next =
          shouldReplace && prev === prefillStr ? digit : `${prev}${digit}`
        if (next.length > 3) return prev
        const value = Number(next)
        if (value > 180) return prev
        // Reject completed impossible totals (e.g. 179) while allowing prefixes.
        if (next.length === 3 && !isValidVisitScore(value)) return prev
        return next
      })
    },
    [disabled, isEdit, prefillScore, prefillStr, replaceNextDigit],
  )

  /**
   * Removes the last digit from the buffer.
   *
   * @example
   * backspace()
   */
  const backspace = useCallback(() => {
    if (disabled) return
    setReplaceNextDigit(false)
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
    setReplaceNextDigit(false)
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
    const result = onSubmit(value)
    if (result === false) return
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
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
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
      {isEdit && errorMessage !== null ? (
        <div className={styles.toast} role="alert" aria-live="assertive">
          <span className={styles.toastIcon} aria-hidden="true">
            !
          </span>
          <span>{errorMessage}</span>
        </div>
      ) : null}

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
          onClick={backspace}
          aria-label="Backspace"
        >
          <BackspaceIcon />
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
          className={clsx(styles.key, styles.submit)}
          disabled={
            disabled || buffer === '' || (isEdit && errorMessage !== null)
          }
          onClick={submit}
        >
          {isEdit ? 'Update' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

export default ScorePad
