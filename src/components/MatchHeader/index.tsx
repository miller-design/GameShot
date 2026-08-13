import clsx from 'clsx'

import type { MatchState, PlayerIndex } from '#/types/match'

import styles from './styles.module.css'

type MatchHeaderProps = {
  match: MatchState
  className?: string
}

/**
 * Match header — player names, leg score, turn marker.
 *
 * @param props.match - Full match state
 * @param props.className - Optional class on the header
 *
 * @example
 * <MatchHeader match={match} />
 */
const MatchHeader = ({ match, className }: MatchHeaderProps) => {
  const thrower = match.currentLeg.currentPlayer
  const names = match.config.playerNames
  const [legs0, legs1] = match.legsWon
  const [sets0, sets1] = match.setsWon
  const isPractice = match.config.playMode === 'practice'
  const is121 = match.config.gameType === '121' && match.game121 !== null

  /**
   * Renders a player name with an optional turn asterisk.
   *
   * @param player - Player index
   * @param align - Text alignment side
   * @param label - Display name
   *
   * @example
   * renderName(0, 'left', 'Alice')
   */
  function renderName(
    player: PlayerIndex,
    align: 'left' | 'right',
    label: string,
  ) {
    const active =
      thrower === player &&
      match.pendingLegWinner === null &&
      match.matchWinner === null
    return (
      <div
        className={clsx(
          styles.name,
          align === 'left' ? styles.left : styles.right,
          active && styles.active,
        )}
      >
        {active && (
          <span className={styles.marker} aria-hidden="true">
            *
          </span>
        )}
        <span>{label}</span>
      </div>
    )
  }

  if (is121) {
    return (
      <header className={clsx(styles.root, styles.practice, className)}>
        {renderName(0, 'left', names[0])}
      </header>
    )
  }

  if (isPractice) {
    return (
      <header className={clsx(styles.root, styles.practice, className)}>
        {renderName(0, 'left', names[0])}
        <div className={styles.legs} aria-label="Legs completed">
          Legs: {legs0}
        </div>
      </header>
    )
  }

  return (
    <header className={clsx(styles.root, className)}>
      {renderName(0, 'left', names[0])}
      <div className={styles.legs} aria-label="Set and leg score">
        Sets {sets0}–{sets1} · Legs {legs0}–{legs1}
      </div>
      {renderName(1, 'right', names[1])}
    </header>
  )
}

export default MatchHeader
