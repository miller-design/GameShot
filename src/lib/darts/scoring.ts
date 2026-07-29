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
export function legsToWin(
  config: Pick<MatchConfig, 'mode' | 'legsTarget'>,
): number {
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
export function createLeg(
  startingScore: number,
  firstThrower: PlayerIndex,
): LegState {
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
 *   playMode: 'matchplay',
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
    pendingLegCheckoutDartsUsed: null,
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
 * Returns the minimum number of darts required to finish `checkout` on a
 * double-out (bull counts as a double).
 *
 * The app records checkout only as a *visit total* (0–180). The minimum
 * therefore depends only on the checkout number itself.
 */
export function minDartsForCheckout(
  checkout: number,
): 1 | 2 | 3 {
  if (!isValidCheckout(checkout)) return 3

  // 1-dart checkout: bullseye (50) or any double (2..40 even)
  if (checkout === 50) return 1
  if (checkout % 2 === 0) {
    const half = checkout / 2
    if (half >= 1 && half <= 20) return 1
  }

  const finishingOneDart = new Set<number>()
  for (let i = 1; i <= 20; i++) finishingOneDart.add(i * 2) // D1..D20
  finishingOneDart.add(50) // bull counts as a "double"

  // Any score reachable with one dart.
  const oneDartScores = new Set<number>()
  for (let i = 1; i <= 20; i++) oneDartScores.add(i) // S1..S20
  oneDartScores.add(25) // outer bull
  oneDartScores.add(50) // inner bull
  for (let i = 1; i <= 20; i++) {
    oneDartScores.add(i * 2) // doubles
    oneDartScores.add(i * 3) // triples
  }

  // 2-dart checkout exists if checkout = (one-dart score) + (double/bull)
  for (const last of finishingOneDart) {
    const first = checkout - last
    if (first === 0) continue
    if (oneDartScores.has(first)) return 2
  }

  return 3
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
      pendingLegCheckoutDartsUsed: minDartsForCheckout(scored),
    }
  }

  // Practice is solo — never advance to player 1.
  const nextPlayer: PlayerIndex =
    state.config.playMode === 'practice' ? 0 : player === 0 ? 1 : 0

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

  const checkoutVisit = state.currentLeg.visits.find(
    (v) => v.player === winner && v.checkout,
  )
  const checkoutDartsUsed =
    state.pendingLegCheckoutDartsUsed ??
    (checkoutVisit ? minDartsForCheckout(checkoutVisit.scored) : 3)

  const updatedVisits: Visit[] = state.currentLeg.visits.map((v) => {
    if (v.player === winner && v.checkout) {
      return { ...v, dartsUsed: checkoutDartsUsed }
    }
    return v
  })

  const legsWon: [number, number] = [...state.legsWon]
  legsWon[winner] += 1

  const finishedLeg: LegState = {
    ...state.currentLeg,
    visits: updatedVisits,
    winner,
  }

  // Practice never ends the session — legsWon[0] tracks legs completed.
  if (state.config.playMode === 'practice') {
    return {
      ...state,
      legsWon,
      completedLegs: [...state.completedLegs, finishedLeg],
      currentLeg: createLeg(state.config.startingScore, 0),
      pendingLegWinner: null,
      pendingLegCheckoutDartsUsed: null,
      lastBust: false,
    }
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
      pendingLegCheckoutDartsUsed: null,
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
    pendingLegCheckoutDartsUsed: null,
    lastBust: false,
  }
}

/**
 * Updates the user's selection for how many darts were used on the pending
 * checkout.
 *
 * @param state - Match state with `pendingLegWinner` set
 * @param dartsUsed - User-selected darts used on the checkout visit
 *
 * @example
 * setPendingLegCheckoutDartsUsed(state, 2)
 */
export function setPendingLegCheckoutDartsUsed(
  state: MatchState,
  dartsUsed: 1 | 2 | 3,
): MatchState {
  if (state.pendingLegWinner === null) return state

  const checkoutVisit = state.currentLeg.visits.find(
    (v) => v.player === state.pendingLegWinner && v.checkout,
  )
  if (!checkoutVisit) return state

  const min = minDartsForCheckout(checkoutVisit.scored)
  if (dartsUsed < min) return state

  if (state.pendingLegCheckoutDartsUsed === dartsUsed) return state

  return {
    ...state,
    pendingLegCheckoutDartsUsed: dartsUsed,
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
    pendingLegCheckoutDartsUsed: null,
    lastBust: false,
  }
}

/**
 * Replays a leg after replacing one visit's scored value (no product guards).
 *
 * @param state - Current match state
 * @param visitIndex - Absolute index into `state.currentLeg.visits` (0-based)
 * @param scored - New visit total (must be an integer 0–180)
 * @returns Replayed match state, or the original state when input is invalid
 *
 * @example
 * previewEditVisit(state, 0, 70)
 */
export function previewEditVisit(
  state: MatchState,
  visitIndex: number,
  scored: number,
): MatchState {
  if (state.matchWinner !== null) {
    return state
  }
  if (!isValidVisitScore(scored)) {
    return state
  }

  const leg = state.currentLeg
  if (visitIndex < 0 || visitIndex >= leg.visits.length) {
    return state
  }

  // Keep earlier visits unchanged; replay from the edited visit forward.
  const keptVisits = leg.visits.slice(0, visitIndex)
  const replayStartRemaining = rebuildRemaining(
    state.config.startingScore,
    keptVisits,
  )

  const replayRemaining: [number, number] = [...replayStartRemaining]
  const updatedVisits: Visit[] = [...keptVisits]

  let winner: PlayerIndex | null = null
  let pendingLegWinner: PlayerIndex | null = null
  let pendingLegCheckoutDartsUsed: 1 | 2 | 3 | null = null
  let lastBust = false

  for (let i = visitIndex; i < leg.visits.length; i++) {
    const original = leg.visits[i]
    const player = original.player
    const before = replayRemaining[player]
    const nextScored = i === visitIndex ? scored : original.scored

    const result = evaluateVisit(before, nextScored)

    updatedVisits.push({
      player,
      scored: nextScored,
      remaining: result.remaining,
      bust: result.bust,
      checkout: result.checkout,
    })

    replayRemaining[player] = result.remaining

    if (result.checkout) {
      winner = player
      pendingLegWinner = player
      pendingLegCheckoutDartsUsed = minDartsForCheckout(nextScored)
      lastBust = false
      break // A checkout ends the leg immediately.
    }

    lastBust = result.bust
  }

  const currentPlayer: PlayerIndex = (() => {
    if (winner !== null) {
      // On checkout, submitVisit does not advance turn; the thrower stays current.
      return winner
    }
    const last = updatedVisits[updatedVisits.length - 1]
    return last.player === 0 ? 1 : 0
  })()

  return {
    ...state,
    currentLeg: {
      ...leg,
      visits: updatedVisits,
      remaining: replayRemaining,
      currentPlayer,
      winner,
    },
    pendingLegWinner,
    pendingLegCheckoutDartsUsed,
    lastBust,
  }
}

/**
 * Whether a previewed edit would finish the leg via a visit other than the one
 * being edited (winning / checking out by correcting an earlier score).
 *
 * @param state - Match state before the edit
 * @param visitIndex - Visit being edited
 * @param preview - Result of `previewEditVisit`
 * @returns True when the edit should be blocked as a leg-winning cascade
 *
 * @example
 * editWouldCheckoutOtherVisit(state, 2, previewEditVisit(state, 2, 101))
 */
export function editWouldCheckoutOtherVisit(
  state: MatchState,
  visitIndex: number,
  preview: MatchState,
): boolean {
  void state
  const checkoutIndex = preview.currentLeg.visits.findIndex((v) => v.checkout)
  if (checkoutIndex === -1) return false
  // Allow correcting the finishing visit itself; block cascading checkouts.
  return checkoutIndex !== visitIndex
}

/**
 * Whether a previewed edit would newly make the latest visit a bust.
 *
 * @param state - Match state before the edit
 * @param preview - Result of `previewEditVisit`
 * @returns True when the last visit becomes a bust and was not already a bust
 *
 * @example
 * editWouldBustLatestVisit(state, previewEditVisit(state, 0, 180))
 */
export function editWouldBustLatestVisit(
  state: MatchState,
  preview: MatchState,
): boolean {
  const beforeLatest = state.currentLeg.visits.at(-1)
  const afterLatest = preview.currentLeg.visits.at(-1)
  if (!afterLatest?.bust) return false
  return !beforeLatest?.bust
}

/**
 * Edits a previously recorded visit by index and replays the leg from there.
 *
 * Refuses edits that would check out the leg via a different visit than the one
 * being corrected (players must enter a finish on a normal turn).
 *
 * @param state - Current match state
 * @param visitIndex - Absolute index into `state.currentLeg.visits` (0-based)
 * @param scored - New visit total (must be an integer 0–180)
 *
 * @returns Updated match state. If the edit cannot be applied (invalid input,
 * match already finished, out-of-range index, or blocked checkout cascade),
 * returns the original state.
 *
 * @example
 * // Correct the first recorded visit and automatically replay everything after it.
 * editVisit(state, 0, 70)
 */
export function editVisit(
  state: MatchState,
  visitIndex: number,
  scored: number,
): MatchState {
  const preview = previewEditVisit(state, visitIndex, scored)
  if (preview === state) {
    return state
  }
  if (editWouldCheckoutOtherVisit(state, visitIndex, preview)) {
    return state
  }
  return preview
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
export function computePlayerStats(
  state: MatchState,
  player: PlayerIndex,
): PlayerStats {
  const pendingWinner = state.pendingLegWinner
  const pendingCheckoutDartsUsed = state.pendingLegCheckoutDartsUsed

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
  let highestScore: number | null = null
  let highestCheckout: number | null = null

  for (const leg of allLegs) {
    for (const visit of leg.visits) {
      if (visit.player !== player) continue
      const dartsForVisit = (() => {
        // Only checkout visits can be confirmed as 1–2–3 darts.
        if (visit.checkout) {
          if (visit.dartsUsed !== undefined) return visit.dartsUsed
          if (
            pendingWinner !== null &&
            pendingCheckoutDartsUsed != null &&
            visit.player === pendingWinner
          ) {
            return pendingCheckoutDartsUsed
          }
        }
        return 3
      })()

      dartsThrown += dartsForVisit
      if (!visit.bust) {
        pointsScored += visit.scored
        highestScore =
          highestScore === null
            ? visit.scored
            : Math.max(highestScore, visit.scored)
      }
      if (visit.checkout) {
        highestCheckout =
          highestCheckout === null
            ? visit.scored
            : Math.max(highestCheckout, visit.scored)
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
    highestScore,
    highestCheckout,
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
    const a = p0Visits[i] as Visit | undefined
    const b = p1Visits[i] as Visit | undefined
    rows.push({
      dartCount: dartCountForVisitIndex(i),
      p0: a ? { scored: a.scored, remaining: a.remaining, bust: a.bust } : null,
      p1: b ? { scored: b.scored, remaining: b.remaining, bust: b.bust } : null,
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
