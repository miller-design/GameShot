import { describe, expect, it } from 'vitest'

import {
  isLegalVisitScore,
  LEGAL_VISIT_SCORES,
  nearestLegalVisit,
} from './dartScores'

describe('LEGAL_VISIT_SCORES', () => {
  it('includes known high finishes and misses', () => {
    for (const score of [0, 26, 60, 100, 140, 170, 171, 174, 177, 180]) {
      expect(isLegalVisitScore(score)).toBe(true)
    }
  })

  it('excludes impossible three-dart totals', () => {
    for (const score of [179, 178, 176, 175, 173, 172, 169]) {
      expect(isLegalVisitScore(score)).toBe(false)
    }
  })

  it('is sorted ascending', () => {
    for (let i = 1; i < LEGAL_VISIT_SCORES.length; i++) {
      expect(LEGAL_VISIT_SCORES[i]).toBeGreaterThan(LEGAL_VISIT_SCORES[i - 1])
    }
  })
})

describe('nearestLegalVisit', () => {
  it('snaps to a legal score within max', () => {
    expect(nearestLegalVisit(87, 100)).toBe(87)
    expect(nearestLegalVisit(179, 180)).toBe(180)
    expect(nearestLegalVisit(50, 40)).toBe(40)
    expect(nearestLegalVisit(173, 180)).toBe(174)
  })
})
