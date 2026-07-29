import { describe, expect, it } from 'vitest'

import { chooseBotVisit } from './bot'
import { isLegalVisitScore } from './dartScores'
import { evaluateVisit, isValidCheckout } from './scoring'
import type { BotDifficulty } from '#/types/match'

/**
 * Deterministic RNG cycling through fixed values.
 *
 * @param values - Sequence of [0, 1) draws
 * @returns RNG function
 *
 * @example
 * const rng = sequenceRng([0.1, 0.9])
 */
function sequenceRng(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length] ?? 0
    i += 1
    return v
  }
}

describe('chooseBotVisit', () => {
  it('only returns legal scores or intentional bust overshoots', () => {
    const remainings = [501, 301, 170, 159, 121, 80, 40, 32, 2]
    const difficulties: BotDifficulty[] = ['easy', 'medium', 'hard']

    for (const difficulty of difficulties) {
      for (const remaining of remainings) {
        for (let n = 0; n < 40; n++) {
          const scored = chooseBotVisit(remaining, difficulty)
          const result = evaluateVisit(remaining, scored)
          if (result.bust && scored !== remaining) {
            // Bust overshoot may be any integer the pad would accept.
            expect(scored).toBeGreaterThanOrEqual(0)
            expect(scored).toBeLessThanOrEqual(180)
          } else if (result.checkout) {
            expect(scored).toBe(remaining)
            expect(isValidCheckout(remaining)).toBe(true)
          } else {
            expect(isLegalVisitScore(scored)).toBe(true)
          }
        }
      }
    }
  })

  it('checks out when RNG forces a takeout', () => {
    // checkoutRate path: first rng < rate for hard (0.75)
    const scored = chooseBotVisit(40, 'hard', sequenceRng([0.1]))
    expect(scored).toBe(40)
  })

  it('produces higher mean visits on hard than easy over many trials', () => {
    let easySum = 0
    let hardSum = 0
    const trials = 400
    for (let i = 0; i < trials; i++) {
      easySum += chooseBotVisit(501, 'easy')
      hardSum += chooseBotVisit(501, 'hard')
    }
    expect(hardSum / trials).toBeGreaterThan(easySum / trials + 15)
  })

  it('checks out more often on hard than easy at 40', () => {
    let easyHits = 0
    let hardHits = 0
    const trials = 300
    for (let i = 0; i < trials; i++) {
      if (chooseBotVisit(40, 'easy') === 40) easyHits += 1
      if (chooseBotVisit(40, 'hard') === 40) hardHits += 1
    }
    expect(hardHits).toBeGreaterThan(easyHits)
  })
})
