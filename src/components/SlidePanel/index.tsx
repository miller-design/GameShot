import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import styles from './styles.module.css'

const CLOSE_DISTANCE = 80
const CLOSE_VELOCITY = 0.55
const ANIMATION_MS = 320

type SlidePanelProps = {
  /**
   * Whether the panel should be visible.
   *
   * @example
   * <SlidePanel open={isOpen} ariaLabel="Help">
   *   <div>...</div>
   * </SlidePanel>
   */
  open: boolean
  /**
   * Label for the dialog for screen readers.
   *
   * @example
   * ariaLabel="Match complete"
   */
  ariaLabel: string
  /**
   * Optional class applied to the slide sheet (not the backdrop).
   *
   * @example
   * <SlidePanel className={styles.panel} ... />
   */
  className?: string
  /**
   * Optional header shown at the top of the panel.
   *
   * When `enableSwipeToClose` is `true`, the header is placed inside the swipe/drag region.
   *
   * @example
   * <SlidePanel header={<div className={styles.top}>...</div>} ... />
   */
  header?: ReactNode
  /**
   * Panel content.
   */
  children: ReactNode
  /**
   * Called when the panel requests closing (Escape key, backdrop click, or swipe-to-close).
   */
  onRequestClose?: () => void
  /**
   * Enables drag/swipe-to-close behavior. Requires `onRequestClose`.
   */
  enableSwipeToClose?: boolean
  /**
   * Z-index for the backdrop. Useful when stacking other overlays.
   */
  zIndex?: number
  /**
   * Whether clicking the backdrop should request closing.
   *
   * Defaults to `true` when `onRequestClose` is provided.
   */
  closeOnBackdropClick?: boolean
}

/**
 * Shared slide-up panel with a fading backdrop and optional swipe-to-dismiss.
 *
 * @param props.open - Whether the panel is visible
 * @param props.ariaLabel - Accessible dialog label
 * @param props.children - Content rendered inside the panel
 * @param props.onRequestClose - Close callback for Escape/backdrop/swipe
 *
 * @example
 * const [open, setOpen] = useState(false)
 * <SlidePanel
 *   open={open}
 *   ariaLabel="Match stats"
 *   onRequestClose={() => setOpen(false)}
 *   enableSwipeToClose
 *   header={<div>...</div>}
 * >
 *   <div>Panel content</div>
 * </SlidePanel>
 */
const SlidePanel = ({
  open,
  ariaLabel,
  className,
  header,
  children,
  onRequestClose,
  enableSwipeToClose = false,
  zIndex,
  closeOnBackdropClick,
}: SlidePanelProps) => {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const velocityY = useRef(0)

  const swipeToClose = enableSwipeToClose && onRequestClose !== undefined

  const shouldCloseOnBackdrop =
    onRequestClose !== undefined &&
    (closeOnBackdropClick ?? true)

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
    if (!open || onRequestClose === undefined) return

    /**
     * Closes the panel when Escape is pressed.
     *
     * @param event - Keyboard event
     *
     * @example
     * // Automatically closes on Escape when onRequestClose is provided.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onRequestClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onRequestClose])

  /**
   * Starts a vertical drag from a touch or pointer down.
   *
   * @param clientY - Pointer Y in viewport coordinates
   *
   * @example
   * beginDrag(event.touches[0].clientY)
   */
  function beginDrag(clientY: number) {
    if (!swipeToClose) return

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
    if (!swipeToClose) return

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

    if (!swipeToClose) {
      setDragY(0)
      return
    }

    const shouldClose = dragY >= CLOSE_DISTANCE || velocityY.current >= CLOSE_VELOCITY
    if (shouldClose) {
      onRequestClose()
      return
    }

    setDragY(0)
  }

  if (!mounted) return null

  const isDragging = swipeToClose && (dragging || dragY > 0)

  return (
    <div
      className={clsx(styles.backdrop, entered && styles.backdropOpen)}
      role="presentation"
      onClick={shouldCloseOnBackdrop ? onRequestClose : undefined}
      style={typeof zIndex === 'number' ? { zIndex } : undefined}
    >
      <div
        ref={sheetRef}
        className={clsx(
          styles.sheet,
          entered && !isDragging && styles.sheetOpen,
          isDragging && styles.sheetDragging,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {swipeToClose ? (
          <div
            className={styles.dragRegion}
            onTouchStart={(e) => {
              beginDrag(e.touches[0].clientY)
            }}
            onTouchMove={(e) => {
              if (!dragging) return
              e.preventDefault()
              moveDrag(e.touches[0].clientY)
            }}
            onTouchEnd={endDrag}
            onTouchCancel={endDrag}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
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
            {header}
          </div>
        ) : header ? (
          <div>{header}</div>
        ) : null}

        {children}
      </div>
    </div>
  )
}

export default SlidePanel

