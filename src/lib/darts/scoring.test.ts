import { describe, expect, it } from 'vitest'

import {
  confirmLeg,
  createMatch,
  evaluateVisit,
  isValidVisitScore,
  legsToWin,
  submitVisit,
  undoVisit,
} from './scoring'
import type { MatchConfig } from '#/types/match'

const baseConfig: MatchConfig = {
  playerNames: ['Alice', 'Bob'],
  startingScore: 501,
  mode: 'first-to',
  legsTarget: 2,
  firstThrower: 0,
}

describe('legsToWin', () => {
  it('returns target for first-to', () => {
    expect(legsToWin({ mode: 'first-to', legsTarget: 3 })).toBe(3)
  })

  it('returns ceil half for best-of', () => {
    expect(legsToWin({ mode: 'best-of', legsTarget: 5 })).toBe(3)
    expect(legsToWin({ mode: 'best-of', legsTarget: 3 })).toBe(2)
  })
})

describe('isValidVisitScore', () => {
  it('accepts 0–180 integers', () => {
    expect(isValidVisitScore(0)).toBe(true)
    expect(isValidVisitScore(180)).toBe(true)
    expect(isValidVisitScore(100)).toBe(true)
  })

  it('rejects out of range', () => {
    expect(isValidVisitScore(-1)).toBe(false)
    expect(isValidVisitScore(181)).toBe(false)
    expect(isValidVisitScore(60.5)).toBe(false)
  })
})

describe('evaluateVisit', () => {
  it('subtracts a normal visit', () => {
    expect(evaluateVisit(501, 60)).toEqual({
      bust: false,
      checkout: false,
      remaining: 441,
    })
  })

  it('busts when remaining goes negative', () => {
    expect(evaluateVisit(40, 41)).toEqual({
      bust: true,
      checkout: false,
      remaining: 40,
    })
  })

  it('busts when left on 1', () => {
    expect(evaluateVisit(50, 49)).toEqual({
      bust: true,
      checkout: false,
      remaining: 50,
    })
  })

  it('checks out on a legal double-out finish', () => {
    expect(evaluateVisit(40, 40)).toEqual({
      bust: false,
      checkout: true,
      remaining: 0,
    })
    expect(evaluateVisit(170, 170)).toEqual({
      bust: false,
      checkout: true,
      remaining: 0,
    })
    expect(evaluateVisit(50, 50)).toEqual({
      bust: false,
      checkout: true,
      remaining: 0,
    })
  })

  it('busts exact finishes that are not legal checkouts', () => {
    expect(evaluateVisit(180, 180)).toEqual({
      bust: true,
      checkout: false,
      remaining: 180,
    })
    expect(evaluateVisit(159, 159)).toEqual({
      bust: true,
      checkout: false,
      remaining: 159,
    })
    expect(evaluateVisit(169, 169)).toEqual({
      bust: true,
      checkout: false,
      remaining: 169,
    })
  })
})

describe('submitVisit / confirmLeg / undoVisit', () => {
  it('advances turn after a normal visit', () => {
    let state = createMatch(baseConfig)
    state = submitVisit(state, 60)
    expect(state.currentLeg.remaining[0]).toBe(441)
    expect(state.currentLeg.currentPlayer).toBe(1)
    expect(state.lastBust).toBe(false)
  })

  it('keeps remaining on bust and advances turn', () => {
    let state = createMatch({ ...baseConfig, startingScore: 501 })
    // Force player 0 to a low remaining via visits… simpler: start and submit from small score by hacking
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }
    state = submitVisit(state, 41)
    expect(state.currentLeg.remaining[0]).toBe(40)
    expect(state.currentLeg.visits[0].bust).toBe(true)
    expect(state.lastBust).toBe(true)
    expect(state.currentLeg.currentPlayer).toBe(1)
  })

  it('sets pendingLegWinner on checkout', () => {
    let state = createMatch(baseConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }
    state = submitVisit(state, 40)
    expect(state.pendingLegWinner).toBe(0)
    expect(state.currentLeg.remaining[0]).toBe(0)
  })

  it('awards leg and starts next with loser throwing first', () => {
    let state = createMatch(baseConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }
    state = submitVisit(state, 40)
    state = confirmLeg(state)
    expect(state.legsWon).toEqual([1, 0])
    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.remaining).toEqual([501, 501])
    expect(state.currentLeg.firstThrower).toBe(1)
    expect(state.currentLeg.currentPlayer).toBe(1)
    expect(state.matchWinner).toBe(null)
  })

  it('marks match winner when first-to reached', () => {
    let state = createMatch({ ...baseConfig, legsTarget: 1 })
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [32, 501],
      },
    }
    state = submitVisit(state, 32)
    state = confirmLeg(state)
    expect(state.matchWinner).toBe(0)
    expect(state.legsWon).toEqual([1, 0])
  })

  it('marks match winner for best-of', () => {
    let state = createMatch({
      ...baseConfig,
      mode: 'best-of',
      legsTarget: 3,
    })
    // Win two legs for player 0
    for (let i = 0; i < 2; i++) {
      state = {
        ...state,
        pendingLegWinner: null,
        currentLeg: {
          ...state.currentLeg,
          remaining: [40, 501] as [number, number],
          visits: [],
          winner: null,
          currentPlayer: 0,
          firstThrower: 0,
        },
      }
      state = submitVisit(state, 40)
      state = confirmLeg(state)
    }
    expect(state.matchWinner).toBe(0)
    expect(state.legsWon[0]).toBe(2)
  })

  it('undoes the last visit', () => {
    let state = createMatch(baseConfig)
    state = submitVisit(state, 60)
    state = undoVisit(state)
    expect(state.currentLeg.visits).toHaveLength(0)
    expect(state.currentLeg.remaining[0]).toBe(501)
    expect(state.currentLeg.currentPlayer).toBe(0)
  })

  it('undoes a pending checkout', () => {
    let state = createMatch({ ...baseConfig, startingScore: 501 })
    // Reach 40 with a recorded visit so undo can rebuild remaining
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
        visits: [
          {
            player: 0,
            scored: 461,
            remaining: 40,
            bust: false,
            checkout: false,
          },
        ],
        currentPlayer: 0,
      },
    }
    state = submitVisit(state, 40)
    expect(state.pendingLegWinner).toBe(0)
    state = undoVisit(state)
    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.remaining[0]).toBe(40)
  })
})
