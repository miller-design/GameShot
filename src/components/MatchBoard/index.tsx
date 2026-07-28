import { useCallback, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'

import MatchHeader from '#/components/MatchHeader'
import MatchResult from '#/components/MatchResult'
import MatchStats from '#/components/MatchStats'
import RemainingScores from '#/components/RemainingScores'
import ScoreHistory from '#/components/ScoreHistory'
import ScorePad from '#/components/ScorePad'
import { useMatch } from '#/store/match'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

type MatchBoardProps = {
  match: MatchState
}

/**
 * Full match scoring board — history, remaining, pad, overlays.
 *
 * @param props.match - Active match state
 *
 * @example
 * <MatchBoard match={match} />
 */
const MatchBoard = ({ match }: MatchBoardProps) => {
  const { submitVisit, undo, clearMatch, clearBustFlag } = useMatch()
  const navigate = useNavigate()
  const [statsOpen, setStatsOpen] = useState(false)
  const statsBtnRef = useRef<HTMLButtonElement>(null)

  const inputLocked =
    match.pendingLegWinner !== null || match.matchWinner !== null

  /**
   * Submits a visit from the score pad.
   *
   * @param scored - Visit total 0–180
   *
   * @example
   * handleSubmit(60)
   */
  const handleSubmit = useCallback(
    (scored: number) => {
      submitVisit(scored)
    },
    [submitVisit],
  )

  /**
   * Exits the match and returns to setup.
   *
   * @example
   * handleExit()
   */
  function handleExit() {
    clearMatch()
    void navigate({ to: '/' })
  }

  /**
   * Closes the stats sheet and clears the Stats button pressed/focus state.
   *
   * @example
   * handleCloseStats()
   */
  function handleCloseStats() {
    setStatsOpen(false)
    statsBtnRef.current?.blur()
  }

  return (
    <div className={styles.root}>
      <MatchHeader match={match} />

      <div className={styles.body}>
        <ScoreHistory match={match} />
        <RemainingScores
          match={match}
          bustFlash={match.lastBust}
          onBustFlashEnd={clearBustFlag}
        />
      </div>

      <nav className={styles.toolbar} aria-label="Match actions">
        <button
          type="button"
          className={styles.toolBtn}
          onClick={undo}
          disabled={match.currentLeg.visits.length === 0 || match.matchWinner !== null}
        >
          Undo
        </button>
        <button
          ref={statsBtnRef}
          type="button"
          className={clsx(styles.toolBtn, statsOpen && styles.toolBtnActive)}
          aria-pressed={statsOpen}
          onClick={() => setStatsOpen(true)}
        >
          Stats
        </button>
        <button type="button" className={styles.toolBtn} onClick={handleExit}>
          Exit
        </button>
      </nav>

      <ScorePad disabled={inputLocked} onSubmit={handleSubmit} />

      <MatchStats match={match} open={statsOpen} onClose={handleCloseStats} />
      <MatchResult match={match} />
    </div>
  )
}

export default MatchBoard
