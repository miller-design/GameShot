import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import {
  buildHistoryRows,
  nextInputRowIndex,
} from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

type ScoreHistoryProps = {
  match: MatchState
  className?: string
}

/**
 * Target-style scored / to-go history grid with dart-count spine.
 *
 * @param props.match - Full match state
 * @param props.className - Optional class on the table wrapper
 *
 * @example
 * <ScoreHistory match={match} />
 */
const ScoreHistory = ({ match, className }: ScoreHistoryProps) => {
  const { currentLeg, config } = match
  const rows = buildHistoryRows(currentLeg)
  const nextRow = nextInputRowIndex(currentLeg)
  const thrower = currentLeg.currentPlayer
  const canHighlight =
    match.pendingLegWinner === null && match.matchWinner === null
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Ensure there is a row for the next input cell
  const displayRows = [...rows]
  while (displayRows.length <= nextRow) {
    displayRows.push({
      dartCount: (displayRows.length + 1) * 3,
      p0: null,
      p1: null,
    })
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [currentLeg.visits.length, nextRow])

  return (
    <div className={clsx(styles.root, className)} ref={scrollerRef}>
      <div className={styles.grid} role="table" aria-label="Score history">
        <div className={styles.head} role="row">
          <div role="columnheader">Scored</div>
          <div role="columnheader">To Go</div>
          <div role="columnheader" className={styles.spine} />
          <div role="columnheader">Scored</div>
          <div role="columnheader">To Go</div>
        </div>

        <div className={styles.row} role="row">
          <div className={styles.cell} role="cell" />
          <div className={clsx(styles.cell, styles.toGo)} role="cell">
            {config.startingScore}
          </div>
          <div className={clsx(styles.cell, styles.spine)} role="cell" />
          <div className={styles.cell} role="cell" />
          <div className={clsx(styles.cell, styles.toGo)} role="cell">
            {config.startingScore}
          </div>
        </div>

        {displayRows.map((row, index) => {
          const highlightP0 = canHighlight && thrower === 0 && index === nextRow
          const highlightP1 = canHighlight && thrower === 1 && index === nextRow
          const showSpine = row.p0 !== null || row.p1 !== null

          return (
            <div
              key={index}
              className={clsx(styles.row, index % 2 === 1 && styles.alt)}
              role="row"
            >
              <div
                className={clsx(
                  styles.cell,
                  highlightP0 && styles.inputCell,
                  row.p0?.bust && styles.bust,
                )}
                role="cell"
              >
                {row.p0 ? (row.p0.bust ? `B ${row.p0.scored}` : row.p0.scored) : ''}
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
                  row.p1?.bust && styles.bust,
                )}
                role="cell"
              >
                {row.p1 ? (row.p1.bust ? `B ${row.p1.scored}` : row.p1.scored) : ''}
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
