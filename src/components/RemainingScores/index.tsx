import clsx from 'clsx'
import { useEffect } from 'react'

import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

type RemainingScoresProps = {
  match: MatchState
  bustFlash: boolean
  onBustFlashEnd: () => void
  className?: string
}

/**
 * Oversized remaining scores with active-player highlight.
 *
 * @param props.match - Full match state
 * @param props.bustFlash - When true, flash the bust animation
 * @param props.onBustFlashEnd - Called after the bust animation finishes
 * @param props.className - Optional class on the root
 *
 * @example
 * <RemainingScores match={match} bustFlash={false} onBustFlashEnd={() => {}} />
 */
const RemainingScores = ({
  match,
  bustFlash,
  onBustFlashEnd,
  className,
}: RemainingScoresProps) => {
  const thrower = match.currentLeg.currentPlayer
  const [r0, r1] = match.currentLeg.remaining
  const inactive =
    match.pendingLegWinner !== null || match.matchWinner !== null
  const lastVisit = match.currentLeg.visits.at(-1)
  const bustedPlayer = bustFlash && lastVisit?.bust ? lastVisit.player : null

  useEffect(() => {
    if (!bustFlash) return
    const id = window.setTimeout(() => onBustFlashEnd(), 450)
    return () => window.clearTimeout(id)
  }, [bustFlash, onBustFlashEnd])

  return (
    <div className={clsx(styles.root, className)}>
      <div
        className={clsx(
          styles.panel,
          !inactive && thrower === 0 && styles.active,
          bustedPlayer === 0 && styles.bust,
        )}
      >
        <span className={styles.score}>{r0}</span>
      </div>
      <div
        className={clsx(
          styles.panel,
          !inactive && thrower === 1 && styles.active,
          bustedPlayer === 1 && styles.bust,
        )}
      >
        <span className={styles.score}>{r1}</span>
      </div>
    </div>
  )
}

export default RemainingScores
