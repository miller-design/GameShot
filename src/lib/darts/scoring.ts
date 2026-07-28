import type {
  LegState,
  MatchConfig,
  MatchState,
  PlayerIndex,
  PlayerStats,
  Visit,
} from '#/types/match'

/**
 * Returns how many legs a player needs to win the match.
 *
 * @param config - Match configuration with mode and legsTarget
 * @returns Legs required to win
 *
 * @example
 * legsToWin({ mode: 'first-to', legsTarget: 3, ... }) // 3
 * legsToWin({ mode: 'best-of', legsTarget: 5, ... })  // 3
 */
export function legsToWin(config: Pick<MatchConfig, 'mode' | 'legsTarget'>): number {
  if (config.mode === 'first-to') {
    return config.legsTarget
  }
  return Math.ceil(config.legsTarget / 2)
}

/**
 * Creates a fresh leg with both players at the starting score.
 *
 * @param startingScore - Opening score for the leg (501 | 701 | 1001)
 * @param firstThrower - Player who throws first
 * @returns New LegState
 *
 * @example
 * createLeg(501, 0)
 */
export function createLeg(startingScore: number, firstThrower: PlayerIndex): LegState {
  return {
    visits: [],
    remaining: [startingScore, startingScore],
    currentPlayer: firstThrower,
    firstThrower,
    winner: null,
  }
}

/**
 * Creates a new match from setup config.
 *
 * @param config - Match setup choices
 * @returns Initial MatchState
 *
 * @example
 * createMatch({
 *   playerNames: ['Alice', 'Bob'],
 *   startingScore: 501,
 *   mode: 'best-of',
 *   legsTarget: 5,
 *   firstThrower: 0,
 * })
 */
export function createMatch(config: MatchConfig): MatchState {
  return {
    config,
    legsWon: [0, 0],
    currentLeg: createLeg(config.startingScore, config.firstThrower),
    completedLegs: [],
    matchWinner: null,
    lastBust: false,
    pendingLegWinner: null,
  }
}

/**
 * Whether a visit score is in the valid entry range (0–180).
 *
 * @param scored - Proposed visit total
 * @returns True if score is an integer between 0 and 180 inclusive
 *
 * @example
 * isValidVisitScore(180) // true
 * isValidVisitScore(181) // false
 */
export function isValidVisitScore(scored: number): boolean {
  return Number.isInteger(scored) && scored >= 0 && scored <= 180
}

/**
 * Double-out checkout totals that cannot be finished in three darts or fewer.
 * (Standard “bogey” numbers — finishing on a double is impossible.)
 */
const IMPOSSIBLE_CHECKOUTS = new Set([159, 162, 163, 165, 166, 168, 169])

/**
 * Whether a remaining score can be checked out under double-out rules
 * (finish on a double / bull, ≤3 darts). Bullseye (50) counts as a double.
 *
 * @param remaining - Score before the finishing visit
 * @returns True if that total is a legal checkout
 *
 * @example
 * isValidCheckout(170) // true — T20 T20 bull
 * isValidCheckout(180) // false — above max checkout
 * isValidCheckout(159) // false — bogey number
 * isValidCheckout(40)  // true — D20
 */
export function isValidCheckout(remaining: number): boolean {
  if (!Number.isInteger(remaining)) return false
  if (remaining < 2 || remaining > 170) return false
  return !IMPOSSIBLE_CHECKOUTS.has(remaining)
}

/**
 * Evaluates a visit against the player's current remaining score.
 * Bust if remaining would be &lt; 0, === 1, or an exact finish that is not a
 * legal double-out checkout. Checkout only when scoring exact remaining on a
 * valid checkout total.
 *
 * @param remaining - Player's score before this visit
 * @param scored - Visit total
 * @returns Result with bust/checkout flags and next remaining
 *
 * @example
 * evaluateVisit(40, 40)   // { bust: false, checkout: true, remaining: 0 }
 * evaluateVisit(180, 180) // { bust: true, checkout: false, remaining: 180 }
 * evaluateVisit(40, 41)   // { bust: true, checkout: false, remaining: 40 }
 * evaluateVisit(50, 49)   // { bust: true, checkout: false, remaining: 50 }
 */
export function evaluateVisit(
  remaining: number,
  scored: number,
): { bust: boolean; checkout: boolean; remaining: number } {
  const next = remaining - scored
  if (next < 0 || next === 1) {
    return { bust: true, checkout: false, remaining }
  }
  if (next === 0) {
    if (isValidCheckout(remaining)) {
      return { bust: false, checkout: true, remaining: 0 }
    }
    // Exact remaining but not a legal double-out finish (e.g. 159, 180)
    return { bust: true, checkout: false, remaining }
  }
  return { bust: false, checkout: false, remaining: next }
}

/**
 * Applies a visit to the match. On checkout, sets pendingLegWinner
 * (caller should confirm before starting the next leg).
 *
 * @param state - Current match state
 * @param scored - Visit total (0–180)
 * @returns Updated MatchState, or the same state if invalid / match over
 *
 * @example
 * submitVisit(state, 60)
 */
export function submitVisit(state: MatchState, scored: number): MatchState {
  if (state.matchWinner !== null || state.pendingLegWinner !== null) {
    return state
  }
  if (!isValidVisitScore(scored)) {
    return state
  }

  const leg = state.currentLeg
  if (leg.winner !== null) {
    return state
  }

  const player = leg.currentPlayer
  const before = leg.remaining[player]
  const result = evaluateVisit(before, scored)

  const visit: Visit = {
    player,
    scored,
    remaining: result.remaining,
    bust: result.bust,
    checkout: result.checkout,
  }

  const nextRemaining: [number, number] = [...leg.remaining]
  nextRemaining[player] = result.remaining

  const visits = [...leg.visits, visit]

  if (result.checkout) {
    return {
      ...state,
      currentLeg: {
        ...leg,
        visits,
        remaining: nextRemaining,
        winner: player,
      },
      lastBust: false,
      pendingLegWinner: player,
    }
  }

  const nextPlayer: PlayerIndex = player === 0 ? 1 : 0

  return {
    ...state,
    currentLeg: {
      ...leg,
      visits,
      remaining: nextRemaining,
      currentPlayer: nextPlayer,
    },
    lastBust: result.bust,
  }
}

/**
 * Confirms a completed leg: awards the win, starts the next leg
 * (loser throws first), or marks match winner.
 *
 * @param state - Match with pendingLegWinner set
 * @returns Updated MatchState
 *
 * @example
 * confirmLeg(stateAfterCheckout)
 */
export function confirmLeg(state: MatchState): MatchState {
  const winner = state.pendingLegWinner
  if (winner === null) {
    return state
  }

  const legsWon: [number, number] = [...state.legsWon]
  legsWon[winner] += 1

  const finishedLeg: LegState = {
    ...state.currentLeg,
    winner,
  }

  const needed = legsToWin(state.config)
  if (legsWon[winner] >= needed) {
    return {
      ...state,
      legsWon,
      currentLeg: finishedLeg,
      completedLegs: [...state.completedLegs, finishedLeg],
      matchWinner: winner,
      pendingLegWinner: null,
      lastBust: false,
    }
  }

  // Loser of the leg throws first in the next leg (standard).
  const loser: PlayerIndex = winner === 0 ? 1 : 0

  return {
    ...state,
    legsWon,
    completedLegs: [...state.completedLegs, finishedLeg],
    currentLeg: createLeg(state.config.startingScore, loser),
    pendingLegWinner: null,
    lastBust: false,
  }
}

/**
 * Undoes the last visit. If undoing a checkout before confirm, clears pending.
 *
 * @param state - Current match state
 * @returns MatchState with last visit removed
 *
 * @example
 * undoVisit(state)
 */
export function undoVisit(state: MatchState): MatchState {
  if (state.matchWinner !== null) {
    return state
  }

  const leg = state.currentLeg
  if (leg.visits.length === 0) {
    return state
  }

  const visits = leg.visits.slice(0, -1)
  const last = leg.visits[leg.visits.length - 1]

  // Rebuild remaining from starting score + visits
  const remaining = rebuildRemaining(state.config.startingScore, visits)
  const currentPlayer = last.player

  return {
    ...state,
    currentLeg: {
      ...leg,
      visits,
      remaining,
      currentPlayer,
      winner: null,
    },
    pendingLegWinner: null,
    lastBust: false,
  }
}

/**
 * Rebuilds both players' remaining scores from the visit list.
 *
 * @param startingScore - Opening score for the leg
 * @param visits - Visits so far
 * @returns Remaining tuple [player0, player1]
 *
 * @example
 * rebuildRemaining(501, visits)
 */
export function rebuildRemaining(
  startingScore: number,
  visits: Visit[],
): [number, number] {
  const remaining: [number, number] = [startingScore, startingScore]
  for (const visit of visits) {
    remaining[visit.player] = visit.remaining
  }
  return remaining
}

/**
 * Total darts thrown in a leg (3 per visit).
 *
 * @param visitCount - Number of visits recorded
 * @returns Dart count for the spine column
 *
 * @example
 * dartCountForVisitIndex(0) // 3
 * dartCountForVisitIndex(2) // 9
 */
export function dartCountForVisitIndex(visitIndex: number): number {
  return (visitIndex + 1) * 3
}

/**
 * Computes live stats for a player across the whole match (completed legs + current).
 *
 * @param state - Full match state
 * @param player - Player index
 * @returns PlayerStats
 *
 * @example
 * computePlayerStats(state, 0)
 */
export function computePlayerStats(state: MatchState, player: PlayerIndex): PlayerStats {
  const allLegs = [...state.completedLegs]
  if (state.pendingLegWinner === null && state.matchWinner === null) {
    allLegs.push(state.currentLeg)
  } else if (state.pendingLegWinner !== null) {
    allLegs.push(state.currentLeg)
  }

  let dartsThrown = 0
  let pointsScored = 0
  let lastScore: number | null = null
  let checkouts = 0
  let checkoutAttempts = 0

  for (const leg of allLegs) {
    for (const visit of leg.visits) {
      if (visit.player !== player) continue
      dartsThrown += 3
      if (!visit.bust) {
        pointsScored += visit.scored
      }
      lastScore = visit.scored
      // Double-out attempt: remaining before visit was <= 170 and visit was toward checkout range
      // Simpler v1: count visit as checkout attempt when remaining before was <= 50 or checkout/bust leaving low
      const remainingBefore = visit.bust
        ? visit.remaining
        : visit.remaining + visit.scored
      if (remainingBefore <= 170) {
        // Rough: any visit from a finishable score counts as attempt when scored toward finish
        if (visit.checkout) {
          checkouts += 1
          checkoutAttempts += 1
        } else if (remainingBefore <= 50) {
          checkoutAttempts += 1
        }
      }
    }
  }

  const threeDartAvg = dartsThrown === 0 ? 0 : (pointsScored / dartsThrown) * 3

  return {
    dartsThrown,
    pointsScored,
    lastScore,
    threeDartAvg: Math.round(threeDartAvg * 100) / 100,
    checkouts,
    checkoutAttempts,
  }
}

export type HistoryVisitCell = {
  scored: number
  remaining: number
  bust: boolean
}

export type HistoryRow = {
  dartCount: number
  p0: HistoryVisitCell | null
  p1: HistoryVisitCell | null
}

/**
 * Builds history rows for the Target-style scoreboard.
 * Row i holds each player's i-th visit; dart spine is (i+1)*3.
 *
 * @param leg - Current leg
 * @returns Rows with optional scored/remaining per side and dart spine value
 *
 * @example
 * buildHistoryRows(leg)
 */
export function buildHistoryRows(leg: LegState): HistoryRow[] {
  const p0Visits = leg.visits.filter((v) => v.player === 0)
  const p1Visits = leg.visits.filter((v) => v.player === 1)
  const rowCount = Math.max(p0Visits.length, p1Visits.length)
  const rows: HistoryRow[] = []

  for (let i = 0; i < rowCount; i++) {
    const a = p0Visits[i]
    const b = p1Visits[i]
    rows.push({
      dartCount: dartCountForVisitIndex(i),
      p0: a
        ? { scored: a.scored, remaining: a.remaining, bust: a.bust }
        : null,
      p1: b
        ? { scored: b.scored, remaining: b.remaining, bust: b.bust }
        : null,
    })
  }

  return rows
}

/**
 * Returns the history row index that should show the next-input highlight.
 *
 * @param leg - Current leg
 * @returns Zero-based row index for the active scored cell
 *
 * @example
 * nextInputRowIndex(leg) // 0 when nobody has thrown yet
 */
export function nextInputRowIndex(leg: LegState): number {
  const count = leg.visits.filter((v) => v.player === leg.currentPlayer).length
  return count
}
