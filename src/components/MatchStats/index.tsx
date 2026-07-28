import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { computePlayerStats } from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

type MatchStatsProps = {
  match: MatchState
  open: boolean
  onClose: () => void
  className?: string
}

const CLOSE_DISTANCE = 80
const CLOSE_VELOCITY = 0.55
const ANIMATION_MS = 320

/**
 * Bottom sheet stats panel — slides up from the bottom, swipe down to dismiss.
 *
 * @param props.match - Full match state
 * @param props.open - Whether the sheet is visible
 * @param props.onClose - Close handler
 * @param props.className - Optional class on the sheet
 *
 * @example
 * <MatchStats match={match} open={true} onClose={() => setOpen(false)} />
 */
const MatchStats = ({ match, open, onClose, className }: MatchStatsProps) => {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const velocityY = useRef(0)

  // Mount / unmount the sheet for enter + exit animations
  useEffect(() => {
    if (open) {
      setMounted(true)
      setDragY(0)
      setDragging(false)
      return
    }

    setEntered(false)
    setDragging(false)
    setDragY(0)
    const timeout = window.setTimeout(() => setMounted(false), ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [open])

  // After the closed sheet is in the DOM, flip `entered` on the next frame
  // so translateY(100%) → 0 always transitions (including reopen).
  useLayoutEffect(() => {
    if (!open || !mounted) return

    setEntered(false)
    void sheetRef.current?.offsetHeight

    let cancelled = false
    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return
      void sheetRef.current?.offsetHeight
      setEntered(true)
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
    }
  }, [open, mounted])

  useEffect(() => {
    if (!open) return

    /**
     * Closes the sheet when Escape is pressed.
     *
     * @param event - Keyboard event
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /**
   * Starts a vertical drag from a touch or pointer down.
   *
   * @param clientY - Pointer Y in viewport coordinates
   *
   * @example
   * beginDrag(event.touches[0].clientY)
   */
  function beginDrag(clientY: number) {
    dragStartY.current = clientY
    lastY.current = clientY
    lastTime.current = performance.now()
    velocityY.current = 0
    setDragging(true)
  }

  /**
   * Updates drag offset while the pointer moves (downward only).
   *
   * @param clientY - Pointer Y in viewport coordinates
   *
   * @example
   * moveDrag(event.touches[0].clientY)
   */
  function moveDrag(clientY: number) {
    const now = performance.now()
    const dy = Math.max(0, clientY - dragStartY.current)
    const dt = now - lastTime.current
    if (dt > 0) {
      velocityY.current = (clientY - lastY.current) / dt
    }
    lastY.current = clientY
    lastTime.current = now
    setDragY(dy)
  }

  /**
   * Ends the drag — closes if distance/velocity threshold met, else snaps back.
   *
   * @example
   * endDrag()
   */
  function endDrag() {
    setDragging(false)
    const shouldClose =
      dragY >= CLOSE_DISTANCE || velocityY.current >= CLOSE_VELOCITY
    if (shouldClose) {
      onClose()
      return
    }
    setDragY(0)
  }

  if (!mounted) return null

  const stats = [computePlayerStats(match, 0), computePlayerStats(match, 1)] as const
  const isDragging = dragging || dragY > 0

  return (
    <div
      className={clsx(styles.backdrop, entered && styles.backdropOpen)}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={clsx(
          styles.sheet,
          entered && !isDragging && styles.sheetOpen,
          isDragging && styles.sheetDragging,
          className,
        )}
        style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Match stats"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.dragRegion}
          onTouchStart={(e) => {
            if (e.touches[0]) beginDrag(e.touches[0].clientY)
          }}
          onTouchMove={(e) => {
            if (!dragging || !e.touches[0]) return
            e.preventDefault()
            moveDrag(e.touches[0].clientY)
          }}
          onTouchEnd={endDrag}
          onTouchCancel={endDrag}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') return
            ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
            beginDrag(e.clientY)
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'touch' || !dragging) return
            moveDrag(e.clientY)
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'touch') return
            endDrag()
          }}
          onPointerCancel={(e) => {
            if (e.pointerType === 'touch') return
            endDrag()
          }}
        >
          <div className={styles.handle} aria-hidden="true" />

          <div className={styles.top}>
            <h2 className={styles.title}>Stats</h2>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              Close
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {([0, 1] as const).map((player) => (
            <div key={player} className={styles.card}>
              <h3 className={styles.name}>{match.config.playerNames[player]}</h3>
              <dl className={styles.list}>
                <div>
                  <dt>3-dart avg</dt>
                  <dd>{stats[player].threeDartAvg.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Darts thrown</dt>
                  <dd>{stats[player].dartsThrown}</dd>
                </div>
                <div>
                  <dt>Last score</dt>
                  <dd>{stats[player].lastScore ?? '—'}</dd>
                </div>
                <div>
                  <dt>Checkouts</dt>
                  <dd>
                    {stats[player].checkouts}
                    {stats[player].checkoutAttempts > 0
                      ? ` / ${stats[player].checkoutAttempts}`
                      : ''}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MatchStats
