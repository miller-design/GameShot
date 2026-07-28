import clsx from 'clsx'
import { useNavigate } from '@tanstack/react-router'

import { computePlayerStats, legsToWin } from '#/lib/darts/scoring'
import { useMatch } from '#/store/match'
import type { MatchState, PlayerIndex } from '#/types/match'

import styles from './styles.module.css'

type MatchResultProps = {
  match: MatchState
  className?: string
}

/**
 * Overlay for leg win acknowledgment or full match result.
 *
 * @param props.match - Full match state
 * @param props.className - Optional class on the overlay panel
 *
 * @example
 * <MatchResult match={match} />
 */
const MatchResult = ({ match, className }: MatchResultProps) => {
  const { confirmLeg, clearMatch, startMatch } = useMatch()
  const navigate = useNavigate()

  const legWinner = match.pendingLegWinner
  const matchWinner = match.matchWinner

  if (legWinner === null && matchWinner === null) {
    return null
  }

  const needed = legsToWin(match.config)
  const decidingLeg =
    legWinner !== null && match.legsWon[legWinner] + 1 >= needed
  const isMatchOver = matchWinner !== null || decidingLeg
  const winnerIndex: PlayerIndex = (matchWinner ?? legWinner) as PlayerIndex
  const winnerName = match.config.playerNames[winnerIndex]
  const displayLegs: [number, number] = [...match.legsWon]
  if (legWinner !== null && matchWinner === null) {
    displayLegs[legWinner] += 1
  }
  const stats = computePlayerStats(match, winnerIndex)

  /**
   * Advances to the next leg after a non-deciding leg win.
   *
   * @example
   * handleNextLeg()
   */
  function handleNextLeg() {
    confirmLeg()
  }

  /**
   * Starts a rematch with the same config.
   *
   * @example
   * handleRematch()
   */
  function handleRematch() {
    startMatch(match.config)
  }

  /**
   * Exits to the setup screen.
   *
   * @example
   * handleNewMatch()
   */
  function handleNewMatch() {
    clearMatch()
    void navigate({ to: '/' })
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={clsx(styles.panel, className)}
        role="dialog"
        aria-label={isMatchOver ? 'Match complete' : 'Leg complete'}
      >
        <p className={styles.eyebrow}>{isMatchOver ? 'Match won' : 'Leg won'}</p>
        <h2 className={styles.title}>{winnerName}</h2>
        <p className={styles.meta}>
          {displayLegs[0]} – {displayLegs[1]}
          {!isMatchOver && <span> · first to {needed}</span>}
        </p>
        <p className={styles.statLine}>
          Avg {stats.threeDartAvg.toFixed(2)} · {stats.dartsThrown} darts
        </p>

        <div className={styles.actions}>
          {isMatchOver ? (
            <>
              <button type="button" className={styles.primary} onClick={handleRematch}>
                Rematch
              </button>
              <button type="button" className={styles.secondary} onClick={handleNewMatch}>
                New match
              </button>
            </>
          ) : (
            <button type="button" className={styles.primary} onClick={handleNextLeg}>
              Next leg
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MatchResult
