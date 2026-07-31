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
    !isPractice && legWinner !== null && match.legsWon[legWinner] + 1 >= needed
  const isPendingCheckout = matchWinner === null && legWinner !== null

  const winnerIndex: PlayerIndex = (matchWinner ?? legWinner) as PlayerIndex
  const winnerName =
    match.config.playerNames[winnerIndex] ||
    (winnerIndex === 0 ? 'Player' : 'Player 2')
  const isMatchComplete = matchWinner !== null
  const playerStats = isMatchComplete
    ? ([computePlayerStats(match, 0), computePlayerStats(match, 1)] as const)
    : null

  const checkoutVisit = match.currentLeg.visits.find(
    (v) => v.player === winnerIndex && v.checkout,
  )
  const checkoutTotal = checkoutVisit?.scored ?? null
  const minDarts =
    checkoutTotal === null ? 3 : minDartsForCheckout(checkoutTotal)
  const selectedCheckoutDartsUsed =
    checkoutVisit?.dartsUsed ??
    (isPendingCheckout ? (match.pendingLegCheckoutDartsUsed ?? minDarts) : 3)

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
      className={clsx(
        styles.panel,
        isPendingCheckout && styles.panelGameShot,
        className,
      )}
      zIndex={50}
    >
      {isMatchComplete ? (
        <>
          <header className={styles.gameShotHeader}>
            <h2 className={styles.title}>
              <span className={styles.eyebrowInline}>
                Match won
                <span className={styles.eyebrowSep} aria-hidden="true">
                  ·
                </span>
                <span className={styles.eyebrowScore}>
                  {match.legsWon[0]}–{match.legsWon[1]}
                </span>
              </span>
              <span className={styles.titleDivider} aria-hidden="true">
                —
              </span>
              <span className={styles.titleName}>{winnerName}</span>
            </h2>
          </header>

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
        <header className={styles.gameShotHeader}>
          <h2 className={styles.title}>
            <span className={styles.eyebrowInline}>
              Game shot
              {!isPractice && decidingLeg ? (
                <>
                  <span className={styles.eyebrowSep} aria-hidden="true">
                    ·
                  </span>
                  Match point
                </>
              ) : null}
            </span>
            <span className={styles.titleDivider} aria-hidden="true">
              —
            </span>
            <span className={styles.titleName}>
              {isPractice ? 'Leg complete' : winnerName}
            </span>
          </h2>
        </header>
      )}

      {isPendingCheckout && (
        <section
          className={styles.checkoutSection}
          aria-label="Game shot confirmation"
        >
          <fieldset className={styles.dartFieldset}>
            <legend className={styles.dartLegend}>
              How many darts to finish?
            </legend>
            <div
              className={styles.dartSegment}
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
                    role="radio"
                    className={clsx(
                      styles.dartOption,
                      selected && styles.dartOptionSelected,
                      disabled && styles.dartOptionDisabled,
                    )}
                    disabled={disabled}
                    aria-checked={selected}
                    aria-label={`${d} dart${d === 1 ? '' : 's'}`}
                    onClick={() => {
                      if (disabled) return
                      setPendingLegCheckoutDartsUsed(d)
                    }}
                  >
                    <span className={styles.dartOptionCount}>{d}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </section>
      )}

      <div
        className={clsx(
          styles.actions,
          isPendingCheckout && styles.actionsCheckout,
        )}
      >
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
              Confirm
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={handleCancelCheckout}
              disabled={!isPendingCheckout}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </SlidePanel>
  )
}

export default MatchResult
