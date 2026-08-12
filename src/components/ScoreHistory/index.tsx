import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import {
  buildHistoryRows,
  evaluateVisit,
  nextInputRowIndex,
  previewEditVisit,
} from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

/** Throw rows kept in view; empty rows pad the grid. */
const VISIBLE_THROW_ROWS = 4

type ScoreHistoryProps = {
  match: MatchState
  className?: string
  editingVisitIndex: number | null
  onEditVisit: (visitIndex: number) => void
  onCancelEdit?: () => void
  inputBuffer?: string
}

type InputPreview = {
  scored: string
  toGo: number
  bust: boolean
}

/**
 * Builds a live preview for the next throw input cell.
 *
 * @param remaining - Player's score before this visit
 * @param buffer - Current score pad digit buffer
 * @returns Preview scored/to-go values, or null when buffer is empty
 *
 * @example
 * previewEntryInput(441, '60') // { scored: '60', toGo: 381, bust: false }
 */
function previewEntryInput(
  remaining: number,
  buffer: string,
): InputPreview | null {
  if (buffer === '') return null
  const scored = Number(buffer)
  const result = evaluateVisit(remaining, scored)
  return { scored: buffer, toGo: result.remaining, bust: result.bust }
}

/**
 * Builds a live preview while editing an existing visit.
 *
 * @param match - Full match state
 * @param visitIndex - Absolute visit index being edited
 * @param buffer - Current score pad digit buffer
 * @returns Preview scored/to-go values, or null when buffer is empty
 *
 * @example
 * previewEditInput(match, 2, '45')
 */
function previewEditInput(
  match: MatchState,
  visitIndex: number,
  buffer: string,
): InputPreview | null {
  if (buffer === '') return null
  const scored = Number(buffer)
  const preview = previewEditVisit(match, visitIndex, scored)
  const visit = preview.currentLeg.visits[visitIndex]
  return { scored: buffer, toGo: visit.remaining, bust: visit.bust }
}

/**
 * Target-style scored / to-go history grid with dart-count spine.
 * Three visible throw rows share a measured row height so the score zone stays
 * visually stable.
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
  inputBuffer = '',
}: ScoreHistoryProps) => {
  const { currentLeg } = match
  const isPractice = match.config.playMode === 'practice'
  const visibleThrowRows = VISIBLE_THROW_ROWS
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
  // Prefill during edit must not paint into the next-throw input cell.
  const entryPreview =
    editingVisitIndex === null
      ? previewEntryInput(currentLeg.remaining[thrower], inputBuffer)
      : null

  const displayRows = [...rows]
  while (displayRows.length < visibleThrowRows) {
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
     * Sizes throw rows so the visible set evenly fills the throw area.
     *
     * @example
     * measureThrowRows()
     */
    function measureThrowRows() {
      const rowHeight = safeThrowArea.clientHeight / visibleThrowRows
      setThrowRowHeight(rowHeight)
    }

    measureThrowRows()

    const observer = new ResizeObserver(measureThrowRows)
    observer.observe(throwArea)

    return () => observer.disconnect()
  }, [visibleThrowRows])

  useEffect(() => {
    const el = throwAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [currentLeg.visits.length, nextRow, throwRowHeight])

  return (
    <div
      className={clsx(styles.root, isPractice && styles.practice, className)}
    >
      <div className={styles.head} role="row">
        <div role="columnheader">Scored</div>
        {isPractice ? (
          <div role="columnheader" className={styles.spine} />
        ) : null}
        <div role="columnheader">To Go</div>
        {!isPractice ? (
          <>
            <div role="columnheader" className={styles.spine} />
            <div role="columnheader">Scored</div>
            <div role="columnheader">To Go</div>
          </>
        ) : null}
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
          const isNextP1 = !isPractice && thrower === 1 && index === nextRow
          const highlightP0 = canHighlight && isNextP0
          const highlightP1 = canHighlight && isNextP1
          const showSpine = row.p0 !== null || (!isPractice && row.p1 !== null)
          const p0AbsIndex = row.p0 ? (p0VisitAbsIndices[index] ?? null) : null
          const p1AbsIndex = row.p1 ? (p1VisitAbsIndices[index] ?? null) : null
          const p0EditPreview =
            p0AbsIndex !== null && p0AbsIndex === editingVisitIndex
              ? previewEditInput(match, p0AbsIndex, inputBuffer)
              : null
          const p1EditPreview =
            p1AbsIndex !== null && p1AbsIndex === editingVisitIndex
              ? previewEditInput(match, p1AbsIndex, inputBuffer)
              : null
          const p0InputPreview = isNextP0 ? entryPreview : null
          const p1InputPreview = isNextP1 ? entryPreview : null
          const p0ScoredPreview = p0EditPreview ?? p0InputPreview
          const p1ScoredPreview = p1EditPreview ?? p1InputPreview

          return (
            <div
              key={index}
              className={clsx(
                styles.row,
                styles.throwRow,
                index % 2 === 1 && styles.alt,
              )}
              role="row"
            >
              <div
                className={clsx(
                  styles.cell,
                  highlightP0 && styles.inputCell,
                  p0AbsIndex !== null &&
                    p0AbsIndex === editingVisitIndex &&
                    styles.editSelected,
                  row.p0?.bust && !p0ScoredPreview && styles.bust,
                  p0ScoredPreview?.bust && styles.bust,
                )}
                role="cell"
                onClick={
                  isNextP0 && editingVisitIndex !== null
                    ? onCancelEdit
                    : undefined
                }
              >
                {p0ScoredPreview ? (
                  <span className={styles.previewScore}>
                    {p0ScoredPreview.scored}
                  </span>
                ) : row.p0 ? (
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
              {isPractice ? (
                <div className={clsx(styles.cell, styles.spine)} role="cell">
                  {showSpine ? row.dartCount : ''}
                </div>
              ) : null}
              <div
                className={clsx(
                  styles.cell,
                  styles.toGo,
                  p0ScoredPreview?.bust && styles.bust,
                )}
                role="cell"
              >
                {p0ScoredPreview
                  ? p0ScoredPreview.toGo
                  : row.p0
                    ? row.p0.remaining
                    : ''}
              </div>
              {!isPractice ? (
                <>
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
                      row.p1?.bust && !p1ScoredPreview && styles.bust,
                      p1ScoredPreview?.bust && styles.bust,
                    )}
                    role="cell"
                    onClick={
                      isNextP1 && editingVisitIndex !== null
                        ? onCancelEdit
                        : undefined
                    }
                  >
                    {p1ScoredPreview ? (
                      <span className={styles.previewScore}>
                        {p1ScoredPreview.scored}
                      </span>
                    ) : row.p1 ? (
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
                  <div
                    className={clsx(
                      styles.cell,
                      styles.toGo,
                      p1ScoredPreview?.bust && styles.bust,
                    )}
                    role="cell"
                  >
                    {p1ScoredPreview
                      ? p1ScoredPreview.toGo
                      : row.p1
                        ? row.p1.remaining
                        : ''}
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScoreHistory
