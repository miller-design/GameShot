import clsx from 'clsx'
import { useNavigate } from '@tanstack/react-router'

import {
  computePlayerStats,
  legsToWin,
  minDartsForCheckout,
} from '#/lib/darts/scoring'
import { useMatch } from '#/store/match'
import type { MatchState, PlayerIndex } from '#/types/match'

import SlidePanel from '../SlidePanel'

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
  const {
    confirmLeg,
    clearMatch,
    startMatch,
    setPendingLegCheckoutDartsUsed,
    undo,
  } = useMatch()
  const navigate = useNavigate()

  const legWinner = match.pendingLegWinner
  const matchWinner = match.matchWinner

  const open = legWinner !== null || matchWinner !== null
  if (!open) {
    return (
      <SlidePanel
        open={false}
        ariaLabel="Match result"
        className={clsx(styles.panel, className)}
        zIndex={50}
      >
        {null}
      </SlidePanel>
    )
  }

  const needed = legsToWin(match.config)
  const isPractice = match.config.playMode === 'practice'
  const decidingLeg =
    !isPractice &&
    legWinner !== null &&
    match.legsWon[legWinner] + 1 >= needed
  const isPendingCheckout = matchWinner === null && legWinner !== null

  const winnerIndex: PlayerIndex = (matchWinner ?? legWinner) as PlayerIndex
  const winnerName =
    match.config.playerNames[winnerIndex] ||
    (winnerIndex === 0 ? 'Player' : 'Computer')
  const isMatchComplete = matchWinner !== null
  const playerStats = isMatchComplete
    ? ([computePlayerStats(match, 0), computePlayerStats(match, 1)] as const)
    : null

  const checkoutVisit = match.currentLeg.visits.find(
    (v) => v.player === winnerIndex && v.checkout,
  )
  const checkoutTotal = checkoutVisit?.scored ?? null
  const minDarts = checkoutTotal === null ? 3 : minDartsForCheckout(checkoutTotal)
  const selectedCheckoutDartsUsed =
    checkoutVisit?.dartsUsed ??
    (isPendingCheckout
      ? match.pendingLegCheckoutDartsUsed ?? minDarts
      : 3)

  /**
   * Confirms the pending checkout and advances the match.
   *
   * @example
   * handleConfirmCheckout()
   */
  function handleConfirmCheckout() {
    confirmLeg()
  }

  /**
   * Cancels an incorrect checkout submission by undoing the finishing visit.
   *
   * @example
   * handleCancelCheckout()
   */
  function handleCancelCheckout() {
    undo()
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
    <SlidePanel
      open={open}
      ariaLabel={matchWinner !== null ? 'Match complete' : 'Leg complete'}
      className={clsx(styles.panel, className)}
      zIndex={50}
    >
      {isMatchComplete ? (
        <>
          <p className={styles.eyebrow}>Match won</p>
          <h2 className={styles.title}>{winnerName}</h2>
          <p className={styles.meta}>
            {match.legsWon[0]}–{match.legsWon[1]} legs
          </p>

          <div className={styles.statsGrid}>
            {([0, 1] as const).map((player) => {
              const stats = playerStats![player]
              const isWinner = player === matchWinner
              return (
                <div
                  key={player}
                  className={clsx(
                    styles.statsCard,
                    isWinner && styles.statsCardWinner,
                  )}
                >
                  <h3 className={styles.statsName}>
                    {match.config.playerNames[player]}
                    {isWinner ? (
                      <span className={styles.winnerBadge}>Winner</span>
                    ) : null}
                  </h3>
                  <dl className={styles.statsList}>
                    <div>
                      <dt>3-dart avg</dt>
                      <dd>{stats.threeDartAvg.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Darts thrown</dt>
                      <dd>{stats.dartsThrown}</dd>
                    </div>
                    <div>
                      <dt>Highest score</dt>
                      <dd>{stats.highestScore ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Highest checkout</dt>
                      <dd>{stats.highestCheckout ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <p className={styles.eyebrow}>Game shot</p>
          <h2 className={styles.title}>
            {isPractice ? 'Leg complete' : winnerName}
          </h2>
          {isPractice ? (
            <p className={styles.meta}>
              Legs completed: {match.legsWon[0]} — confirm checkout
            </p>
          ) : decidingLeg ? (
            <p className={styles.meta}>Match point — confirm checkout</p>
          ) : (
            <p className={styles.meta}>Leg won — confirm checkout</p>
          )}
        </>
      )}

      {isPendingCheckout && (
        <div
          className={styles.gameShotCard}
          aria-label="Game shot confirmation"
        >
          <p className={styles.gameShotName}>Darts used</p>
          <div
            className={styles.dartGrid}
            role="radiogroup"
            aria-label="Darts used on checkout"
          >
            {([1, 2, 3] as const).map((d) => {
              const disabled = d < minDarts
              const selected = d === selectedCheckoutDartsUsed
              return (
                <button
                  key={d}
                  type="button"
                  className={clsx(styles.dartBtn, selected && styles.dartBtnSelected)}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => {
                    if (disabled) return
                    setPendingLegCheckoutDartsUsed(d)
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className={styles.hint}>Invalid options are disabled.</p>
        </div>
      )}

      <div className={styles.actions}>
        {matchWinner !== null ? (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={handleRematch}
            >
              Rematch
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={handleNewMatch}
            >
              New match
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={handleConfirmCheckout}
              disabled={!isPendingCheckout}
            >
              {isPractice
                ? `Confirm game shot (${selectedCheckoutDartsUsed} darts)`
                : `Confirm game shot (${selectedCheckoutDartsUsed} darts)${decidingLeg ? ' (match)' : ''}`}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={handleCancelCheckout}
              disabled={!isPendingCheckout}
            >
              Cancel — wrong score
            </button>
          </>
        )}
      </div>
    </SlidePanel>
  )
}

export default MatchResult
