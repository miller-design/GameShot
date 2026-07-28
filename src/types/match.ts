/**
 * Core match and scoring types for GameShot.
 */

/** Supported starting scores for a leg. */
export type StartingScore = 501 | 701 | 1001

/** How the match is decided. */
export type MatchMode = 'first-to' | 'best-of'

/** Player index in a two-player match. */
export type PlayerIndex = 0 | 1

/** Configuration chosen on the setup screen. */
export type MatchConfig = {
  playerNames: [string, string]
  startingScore: StartingScore
  mode: MatchMode
  /** First-to: legs needed to win. Best-of: total legs in the series. */
  legsTarget: number
  /** Who throws first in leg 1. */
  firstThrower: PlayerIndex
}

/** A single visit (up to 3 darts) recorded during a leg. */
export type Visit = {
  player: PlayerIndex
  /** Points scored this visit (0–180). Busts still record the attempted score. */
  scored: number
  /** Remaining after this visit (unchanged on bust). */
  remaining: number
  /** True when the visit busted (score not subtracted). */
  bust: boolean
  /** True when this visit checked out the leg. */
  checkout: boolean
}

/** State of the current (or just-finished) leg. */
export type LegState = {
  visits: Visit[]
  remaining: [number, number]
  /** Whose turn it is to throw. */
  currentPlayer: PlayerIndex
  /** Who threw first this leg. */
  firstThrower: PlayerIndex
  /** Winner of this leg, if finished. */
  winner: PlayerIndex | null
}

/** Full match state used by the store and UI. */
export type MatchState = {
  config: MatchConfig
  legsWon: [number, number]
  currentLeg: LegState
  /** Legs completed (for history / rematch). */
  completedLegs: LegState[]
  /** Match winner when someone has reached the target. */
  matchWinner: PlayerIndex | null
  /** Brief UI flag after a bust. */
  lastBust: boolean
  /** Pending leg win awaiting user acknowledgment. */
  pendingLegWinner: PlayerIndex | null
}

/** Per-player live stats for the current match. */
export type PlayerStats = {
  dartsThrown: number
  pointsScored: number
  lastScore: number | null
  threeDartAvg: number
  checkouts: number
  checkoutAttempts: number
}
