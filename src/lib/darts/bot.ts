/**
 * Computer opponent visit selection for vs-computer matches.
 * Only produces legal 3-dart totals (or intentional bust overshoots).
 */

import {
  chooseSetupVisit,
  isLegalVisitScore,
  nearestLegalVisit,
} from '#/lib/darts/dartScores'
import { isValidCheckout } from '#/lib/darts/scoring'
import type { BotDifficulty } from '#/types/match'

/** Bogey remainings that cannot be checked out in ≤3 darts. */
const BOGEYS = new Set([159, 162, 163, 165, 166, 168, 169])

type TierProfile = {
  /** Target three-dart average for scoring visits. */
  targetAvg: number
  /** Spread around the target when sampling a visit. */
  spread: number
  /** Probability of attempting a legal checkout when in range. */
  checkoutRate: number
  /** Probability of busting on a missed double / low remaining. */
  bustOnMissRate: number
  /** Prefer avoiding bogey leaves after a scoring visit. */
  avoidBogey: boolean
  /** Weight toward high treble visits (60 / 100 / 140 / 180). */
  trebleBias: number
}

const TIER: Record<BotDifficulty, TierProfile> = {
  easy: {
    targetAvg: 45,
    spread: 28,
    checkoutRate: 0.35,
    bustOnMissRate: 0.35,
    avoidBogey: false,
    trebleBias: 0.1,
  },
  medium: {
    targetAvg: 65,
    spread: 32,
    checkoutRate: 0.55,
    bustOnMissRate: 0.18,
    avoidBogey: true,
    trebleBias: 0.35,
  },
  hard: {
    targetAvg: 85,
    spread: 36,
    checkoutRate: 0.75,
    bustOnMissRate: 0.06,
    avoidBogey: true,
    trebleBias: 0.55,
  },
}

/** Classic high visits weighted by tier treble bias. */
const TREBLE_VISITS = [60, 80, 81, 85, 100, 120, 125, 133, 140, 160, 171, 174, 177, 180]

/**
 * Samples a triangular-ish offset in roughly [-spread, +spread].
 *
 * @param spread - Half-width of the noise band
 * @param rng - Random in [0, 1)
 * @returns Signed offset
 *
 * @example
 * sampleOffset(30, Math.random)
 */
function sampleOffset(spread: number, rng: () => number): number {
  return (rng() + rng() - 1) * spread
}

/**
 * Picks a weighted treble-style visit near the target band.
 *
 * @param target - Desired visit total
 * @param maxScore - Inclusive max legal score
 * @param rng - Random in [0, 1)
 * @returns Legal visit or null
 *
 * @example
 * pickTrebleVisit(90, 200, Math.random)
 */
function pickTrebleVisit(
  target: number,
  maxScore: number,
  rng: () => number,
): number | null {
  const options = TREBLE_VISITS.filter(
    (s) => s <= maxScore && isLegalVisitScore(s),
  )
  if (options.length === 0) return null
  // Prefer options close to target.
  options.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
  const top = options.slice(0, Math.min(5, options.length))
  const index = Math.min(top.length - 1, Math.floor(rng() * top.length))
  return top[index] ?? null
}

/**
 * Chooses a scoring (non-checkout) visit for the given remaining.
 *
 * @param remaining - Score before this visit
 * @param difficulty - Bot tier
 * @param rng - Random in [0, 1)
 * @returns Visit total 0–180
 *
 * @example
 * chooseScoringVisit(501, 'medium', Math.random)
 */
function chooseScoringVisit(
  remaining: number,
  difficulty: BotDifficulty,
  rng: () => number,
): number {
  const profile = TIER[difficulty]
  // Keep at least a double leave when possible.
  const maxSafe = Math.max(0, remaining - 2)

  if (maxSafe === 0) {
    return 0
  }

  // Prefer classic setup leaves when remaining is in the mid-range.
  if (remaining <= 170 && rng() < 0.45) {
    const setup = chooseSetupVisit(
      remaining,
      profile.avoidBogey,
      BOGEYS,
      rng,
    )
    if (setup !== null) return setup
  }

  let target = profile.targetAvg + sampleOffset(profile.spread, rng)
  target = Math.max(0, Math.min(maxSafe, target))

  if (rng() < profile.trebleBias) {
    const treble = pickTrebleVisit(target, maxSafe, rng)
    if (treble !== null) {
      const leave = remaining - treble
      if (!profile.avoidBogey || !BOGEYS.has(leave) || leave <= 1) {
        return treble
      }
    }
  }

  const scored = nearestLegalVisit(target, maxSafe)
  const leave = remaining - scored

  if (profile.avoidBogey && BOGEYS.has(leave)) {
    const setup = chooseSetupVisit(remaining, true, BOGEYS, rng)
    if (setup !== null) return setup
    // Nudge down until leave is not a bogey.
    for (let attempt = scored; attempt >= 0; attempt--) {
      if (!isLegalVisitScore(attempt)) continue
      if (!BOGEYS.has(remaining - attempt)) return attempt
    }
  }

  return scored
}

/**
 * Handles a finishable remaining: checkout attempt or deliberate miss leave.
 *
 * @param remaining - Legal checkout remaining
 * @param difficulty - Bot tier
 * @param rng - Random in [0, 1)
 * @returns Visit total (exact remaining on success)
 *
 * @example
 * chooseCheckoutVisit(40, 'hard', Math.random)
 */
function chooseCheckoutVisit(
  remaining: number,
  difficulty: BotDifficulty,
  rng: () => number,
): number {
  const profile = TIER[difficulty]

  if (rng() < profile.checkoutRate) {
    return remaining
  }

  // Missed checkout — bust sometimes on low doubles.
  if (remaining <= 50 && rng() < profile.bustOnMissRate) {
    const overshoot = Math.min(180, remaining + 1 + Math.floor(rng() * 8))
    // Bust totals must still be legal 3-dart combinations.
    return isLegalVisitScore(overshoot)
      ? overshoot
      : nearestLegalVisit(overshoot, 180)
  }

  // Leave a decent double / setup.
  const preferredMissLeaves = [32, 40, 16, 36, 24, 20, 8, 12, 4, 2]
  for (const leave of preferredMissLeaves) {
    if (leave >= remaining) continue
    const scored = remaining - leave
    if (isLegalVisitScore(scored) && scored > 0) {
      if (rng() < 0.55) return scored
    }
  }

  const maxSafe = Math.max(0, remaining - 2)
  if (maxSafe === 0) {
    // Only doubles left — chance to hit or bust with a legal visit.
    if (rng() < profile.checkoutRate) return remaining
    const bust = remaining + 1
    return isLegalVisitScore(bust) ? bust : nearestLegalVisit(bust, 180)
  }
  return nearestLegalVisit(Math.min(profile.targetAvg, maxSafe), maxSafe)
}

/**
 * Chooses the bot's visit total for the current remaining score.
 *
 * Uses legal 3-dart combinations only (except intentional bust overshoots).
 * Difficulty tiers differ in average, checkout rate, and leave quality.
 *
 * @param remaining - Bot's score before this visit
 * @param difficulty - Easy / medium / hard
 * @param rng - Optional RNG in [0, 1); defaults to Math.random
 * @returns Visit total to submit (0–180)
 *
 * @example
 * chooseBotVisit(501, 'medium')
 * chooseBotVisit(40, 'hard', () => 0.1) // likely checkout
 */
export function chooseBotVisit(
  remaining: number,
  difficulty: BotDifficulty,
  rng: () => number = Math.random,
): number {
  if (!Number.isInteger(remaining) || remaining <= 0) {
    return 0
  }

  if (isValidCheckout(remaining)) {
    // High finishes are rarer attempts for easy bots.
    if (remaining >= 100 && difficulty === 'easy' && rng() > 0.25) {
      return chooseScoringVisit(remaining, difficulty, rng)
    }
    return chooseCheckoutVisit(remaining, difficulty, rng)
  }

  // Bogey or above-checkout range: score down.
  return chooseScoringVisit(remaining, difficulty, rng)
}
