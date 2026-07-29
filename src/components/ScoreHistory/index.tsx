import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import {
  buildHistoryRows,
  nextInputRowIndex,
} from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

/** Throw rows shown in the score zone; empty rows pad the grid. */
const VISIBLE_THROW_ROWS = 5

type ScoreHistoryProps = {
  match: MatchState
  className?: string
  editingVisitIndex: number | null
  onEditVisit: (visitIndex: number) => void
  onCancelEdit?: () => void
}

/**
 * Target-style scored / to-go history grid with dart-count spine.
 * Throw rows use a fixed height so the score zone stays visually stable.
 *
 * @param props.match - Full match state
 * @param props.className - Optional class on the table wrapper
 *
 * @example
 * <ScoreHistory match={match} />
 */
const ScoreHistory = ({
  match,
  className,
  editingVisitIndex,
  onEditVisit,
  onCancelEdit,
}: ScoreHistoryProps) => {
  const { currentLeg } = match
  const rows = buildHistoryRows(currentLeg)
  const nextRow = nextInputRowIndex(currentLeg)
  const thrower = currentLeg.currentPlayer
  const canEdit = match.matchWinner === null && match.pendingLegWinner === null
  const canHighlight =
    match.pendingLegWinner === null &&
    match.matchWinner === null &&
    editingVisitIndex === null

  const p0VisitAbsIndices: number[] = []
  const p1VisitAbsIndices: number[] = []
  for (let i = 0; i < currentLeg.visits.length; i++) {
    const p = currentLeg.visits[i].player
    if (p === 0) {
      p0VisitAbsIndices.push(i)
    } else {
      p1VisitAbsIndices.push(i)
    }
  }

  const throwAreaRef = useRef<HTMLDivElement>(null)
  const [throwRowHeight, setThrowRowHeight] = useState<number | null>(null)

  const displayRows = [...rows]
  while (displayRows.length < VISIBLE_THROW_ROWS) {
    displayRows.push({
      dartCount: (displayRows.length + 1) * 3,
      p0: null,
      p1: null,
    })
  }
  while (displayRows.length <= nextRow) {
    displayRows.push({
      dartCount: (displayRows.length + 1) * 3,
      p0: null,
      p1: null,
    })
  }

  useEffect(() => {
    const throwArea = throwAreaRef.current
    if (!throwArea) return
    const safeThrowArea = throwArea

    /**
     * Sizes throw rows so five rows evenly fill the throw area.
     *
     * @example
     * measureThrowRows()
     */
    function measureThrowRows() {
      const rowHeight = safeThrowArea.clientHeight / VISIBLE_THROW_ROWS
      setThrowRowHeight(rowHeight)
    }

    measureThrowRows()

    const observer = new ResizeObserver(measureThrowRows)
    observer.observe(throwArea)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = throwAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [currentLeg.visits.length, nextRow, throwRowHeight])

  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.head} role="row">
        <div role="columnheader">Scored</div>
        <div role="columnheader">To Go</div>
        <div role="columnheader" className={styles.spine} />
        <div role="columnheader">Scored</div>
        <div role="columnheader">To Go</div>
      </div>

      <div
        ref={throwAreaRef}
        className={styles.throwArea}
        role="table"
        aria-label="Score history"
        style={
          throwRowHeight === null
            ? undefined
            : ({ '--throw-row-height': `${throwRowHeight}px` } as CSSProperties)
        }
      >
        {displayRows.map((row, index) => {
          const isNextP0 = thrower === 0 && index === nextRow
          const isNextP1 = thrower === 1 && index === nextRow
          const highlightP0 = canHighlight && isNextP0
          const highlightP1 = canHighlight && isNextP1
          const showSpine = row.p0 !== null || row.p1 !== null
          const p0AbsIndex = row.p0 ? p0VisitAbsIndices[index] ?? null : null
          const p1AbsIndex = row.p1 ? p1VisitAbsIndices[index] ?? null : null

          return (
            <div
              key={index}
              className={clsx(styles.row, styles.throwRow, index % 2 === 1 && styles.alt)}
              role="row"
            >
              <div
                className={clsx(
                  styles.cell,
                  highlightP0 && styles.inputCell,
                  p0AbsIndex !== null &&
                    p0AbsIndex === editingVisitIndex &&
                    styles.editSelected,
                  row.p0?.bust && styles.bust,
                )}
                role="cell"
                onClick={
                  isNextP0 && editingVisitIndex !== null
                    ? onCancelEdit
                    : undefined
                }
              >
                {row.p0 ? (
                  <button
                    type="button"
                    className={styles.scoredButton}
                    disabled={!canEdit}
                    onClick={() => {
                      if (p0AbsIndex === null) return
                      onEditVisit(p0AbsIndex)
                    }}
                    aria-label={`Edit scored visit${row.p0.bust ? ' (bust)' : ''}: ${row.p0.bust ? `B ${row.p0.scored}` : row.p0.scored}`}
                    role="presentation"
                  >
                    {row.p0.bust ? `B ${row.p0.scored}` : row.p0.scored}
                  </button>
                ) : (
                  ''
                )}
              </div>
              <div className={clsx(styles.cell, styles.toGo)} role="cell">
                {row.p0 ? row.p0.remaining : ''}
              </div>
              <div className={clsx(styles.cell, styles.spine)} role="cell">
                {showSpine ? row.dartCount : ''}
              </div>
              <div
                className={clsx(
                  styles.cell,
                  highlightP1 && styles.inputCell,
                  p1AbsIndex !== null &&
                    p1AbsIndex === editingVisitIndex &&
                    styles.editSelected,
                  row.p1?.bust && styles.bust,
                )}
                role="cell"
                onClick={
                  isNextP1 && editingVisitIndex !== null
                    ? onCancelEdit
                    : undefined
                }
              >
                {row.p1 ? (
                  <button
                    type="button"
                    className={styles.scoredButton}
                    disabled={!canEdit}
                    onClick={() => {
                      if (p1AbsIndex === null) return
                      onEditVisit(p1AbsIndex)
                    }}
                    aria-label={`Edit scored visit${row.p1.bust ? ' (bust)' : ''}: ${row.p1.bust ? `B ${row.p1.scored}` : row.p1.scored}`}
                    role="presentation"
                  >
                    {row.p1.bust ? `B ${row.p1.scored}` : row.p1.scored}
                  </button>
                ) : (
                  ''
                )}
              </div>
              <div className={clsx(styles.cell, styles.toGo)} role="cell">
                {row.p1 ? row.p1.remaining : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScoreHistory
