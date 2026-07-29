import clsx from 'clsx'

import { computePlayerStats } from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import SlidePanel from '../SlidePanel'
import styles from './styles.module.css'

type MatchStatsProps = {
  match: MatchState
  open: boolean
  onClose: () => void
  className?: string
}

/**
 * Bottom sheet stats panel — slides up from the bottom, swipe down to dismiss.
 *
 * @param props.match - Full match state
 * @param props.open - Whether the sheet is visible
 * @param props.onClose - Close handler
 * @param props.className - Optional class on the sheet
 *
 * @example
 * <MatchStats match={match} open={true} onClose={() => setOpen(false)} />
 */
const MatchStats = ({ match, open, onClose, className }: MatchStatsProps) => {
  const stats = [computePlayerStats(match, 0), computePlayerStats(match, 1)] as const

  return (
    <SlidePanel
      open={open}
      onRequestClose={onClose}
      enableSwipeToClose
      ariaLabel="Match stats"
      className={clsx(styles.panel, className)}
      header={
        <div className={styles.top}>
          <h2 className={styles.title}>Stats</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Close
          </button>
        </div>
      }
    >
      <div className={styles.grid}>
        {([0, 1] as const).map((player) => (
          <div key={player} className={styles.card}>
            <h3 className={styles.name}>{match.config.playerNames[player]}</h3>
            <dl className={styles.list}>
              <div>
                <dt>3-dart avg</dt>
                <dd>{stats[player].threeDartAvg.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Darts thrown</dt>
                <dd>{stats[player].dartsThrown}</dd>
              </div>
              <div>
                <dt>Last score</dt>
                <dd>{stats[player].lastScore ?? '—'}</dd>
              </div>
              <div>
                <dt>Checkouts</dt>
                <dd>
                  {stats[player].checkouts}
                  {stats[player].checkoutAttempts > 0
                    ? ` / ${stats[player].checkoutAttempts}`
                    : ''}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </SlidePanel>
  )
}

export default MatchStats
