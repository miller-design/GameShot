import { describe, expect, it } from 'vitest'

import {
  editVisit,
  confirmLeg,
  createLeg,
  createMatch,
  computePlayerStats,
  evaluateVisit,
  isValidVisitScore,
  legsToWin,
  minDartsForCheckout,
  submitVisit,
  undoVisit,
  setPendingLegCheckoutDartsUsed,
  setLegThrower,
} from './scoring'
import type { MatchConfig } from '#/types/match'

const baseConfig: MatchConfig = {
  gameType: 'x01',
  playMode: 'matchplay',
  playerNames: ['Alice', 'Bob'],
  startingScore: 501,
  mode: 'first-to',
  legsTarget: 2,
  setsMode: 'first-to',
  setsTarget: 1,
  firstThrower: 0,
  game121Increment: 1,
  game121DartsAllowed: 9,
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
  it('accepts legal 0–180 visit totals', () => {
    expect(isValidVisitScore(0)).toBe(true)
    expect(isValidVisitScore(180)).toBe(true)
    expect(isValidVisitScore(100)).toBe(true)
  })

  it('rejects out of range', () => {
    expect(isValidVisitScore(-1)).toBe(false)
    expect(isValidVisitScore(181)).toBe(false)
    expect(isValidVisitScore(60.5)).toBe(false)
  })

  it('rejects impossible three-dart totals', () => {
    expect(isValidVisitScore(179)).toBe(false)
    expect(isValidVisitScore(178)).toBe(false)
    expect(isValidVisitScore(169)).toBe(false)
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

  it('ignores impossible three-dart visit totals', () => {
    let state = createMatch(baseConfig)
    const before = state
    state = submitVisit(state, 179)
    expect(state).toBe(before)
    expect(state.currentLeg.visits).toHaveLength(0)
    expect(state.currentLeg.remaining[0]).toBe(501)
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

  it('awards leg and alternates the next first thrower', () => {
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

  it('starts player 2 on leg 2 when player 1 started and lost leg 1', () => {
    let state = createMatch({
      ...baseConfig,
      playMode: 'matchplay',
      playerNames: ['Player 1', 'Player 2'],
    })
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [501, 40],
        currentPlayer: 1,
      },
    }

    state = submitVisit(state, 40)
    state = confirmLeg(state)

    expect(state.legsWon).toEqual([0, 1])
    expect(state.currentLeg.firstThrower).toBe(1)
    expect(state.currentLeg.currentPlayer).toBe(1)
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

  it('awards a set, resets its leg score, and alternates the next thrower', () => {
    let state = createMatch({
      ...baseConfig,
      legsTarget: 1,
      setsTarget: 2,
    })
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }

    state = confirmLeg(submitVisit(state, 40))

    expect(state.setsWon).toEqual([1, 0])
    expect(state.legsWon).toEqual([0, 0])
    expect(state.matchWinner).toBeNull()
    expect(state.currentLeg.firstThrower).toBe(1)
  })

  it('normalizes best-of formats to odd numbers', () => {
    const state = createMatch({
      ...baseConfig,
      mode: 'best-of',
      legsTarget: 4,
      setsMode: 'best-of',
      setsTarget: 2,
    })

    expect(state.config.legsTarget).toBe(5)
    expect(state.config.setsTarget).toBe(3)
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

describe('setLegThrower', () => {
  it('lets the non-default player open an empty leg', () => {
    const state = setLegThrower(createMatch(baseConfig), 1)
    expect(state.currentLeg.firstThrower).toBe(1)
    expect(state.currentLeg.currentPlayer).toBe(1)
  })

  it('ignores a change after a visit is recorded', () => {
    let state = submitVisit(createMatch(baseConfig), 60)
    state = setLegThrower(state, 1)
    expect(state.currentLeg.firstThrower).toBe(0)
    expect(state.currentLeg.currentPlayer).toBe(1)
  })

  it('can override thrower at the start of a new set', () => {
    let state = createMatch({
      ...baseConfig,
      legsTarget: 1,
      setsTarget: 2,
    })
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }
    state = confirmLeg(submitVisit(state, 40))
    expect(state.currentLeg.firstThrower).toBe(1)

    state = setLegThrower(state, 0)
    expect(state.currentLeg.firstThrower).toBe(0)
    expect(state.currentLeg.currentPlayer).toBe(0)
  })
})

describe('minDartsForCheckout', () => {
  it('returns 1 for one-dart checkouts', () => {
    expect(minDartsForCheckout(40)).toBe(1) // D20
    expect(minDartsForCheckout(50)).toBe(1) // Bullseye
  })

  it('returns 2 for checkouts that can be finished in two darts', () => {
    expect(minDartsForCheckout(80)).toBe(2) // T10 + D20, D20 + D20, etc.
  })

  it('returns 3 for checkouts that require three darts', () => {
    expect(minDartsForCheckout(157)).toBe(3)
  })
})

describe('checkout dart counts affect dartsThrown', () => {
  it('uses pending checkout selection for stats before confirm', () => {
    let state = createMatch(baseConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }

    state = submitVisit(state, 40) // p0 -> 0 checkout (min 1)
    expect(state.pendingLegWinner).toBe(0)

    expect(computePlayerStats(state, 0).dartsThrown).toBe(1)

    state = setPendingLegCheckoutDartsUsed(state, 2)
    expect(computePlayerStats(state, 0).dartsThrown).toBe(2)
  })

  it('persists dartsUsed onto the checkout visit after confirm', () => {
    let state = createMatch(baseConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
      },
    }

    state = submitVisit(state, 40)
    state = setPendingLegCheckoutDartsUsed(state, 3)
    state = confirmLeg(state)

    expect(computePlayerStats(state, 0).dartsThrown).toBe(3)
    expect(computePlayerStats(state, 0).threeDartAvg).toBe(40)
  })

  it('rejects setting a value below the minimum', () => {
    let state = createMatch(baseConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [80, 501],
      },
    }

    state = submitVisit(state, 80) // min is 2
    expect(state.pendingLegCheckoutDartsUsed).toBe(2)

    state = setPendingLegCheckoutDartsUsed(state, 1)
    expect(state.pendingLegCheckoutDartsUsed).toBe(2)
  })
})

describe('editVisit', () => {
  it('replays remaining for later visits when correcting mid-leg score', () => {
    let state = createMatch(baseConfig)
    state = submitVisit(state, 60) // p0 -> 441
    state = submitVisit(state, 60) // p1 -> 441
    state = submitVisit(state, 30) // p0 -> 411
    state = submitVisit(state, 10) // p1 -> 431

    expect(state.currentLeg.remaining).toEqual([411, 431])
    expect(state.currentLeg.currentPlayer).toBe(0)

    state = editVisit(state, 0, 70) // p0 first visit 60 -> 70
    expect(state.currentLeg.remaining[0]).toBe(401)
    expect(state.currentLeg.remaining[1]).toBe(431)
    expect(state.currentLeg.currentPlayer).toBe(0)
    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.winner).toBe(null)
    expect(state.lastBust).toBe(false)

    expect(state.currentLeg.visits[0].scored).toBe(70)
    expect(state.currentLeg.visits).toHaveLength(4)
  })

  it('can flip a later bust into a normal visit when editing earlier score', () => {
    let state = createMatch(baseConfig)
    // Build player0 to 40, then bust on the next visit with 41.
    state = submitVisit(state, 180) // p0 -> 321
    state = submitVisit(state, 60) // p1 -> 441
    state = submitVisit(state, 180) // p0 -> 141
    state = submitVisit(state, 60) // p1 -> 381
    state = submitVisit(state, 101) // p0 -> 40
    state = submitVisit(state, 60) // p1 -> 321
    state = submitVisit(state, 41) // p0 bust (40 - 41)

    expect(state.currentLeg.visits[6].player).toBe(0)
    expect(state.currentLeg.visits[6].bust).toBe(true)
    expect(state.lastBust).toBe(true)
    expect(state.currentLeg.remaining[0]).toBe(40)
    expect(state.pendingLegWinner).toBe(null)

    // Editing the 101 -> 90 adds +11 to scored, raising remaining before 41: 40 - (-?) => 51
    // so 41 becomes normal (51 - 41 = 10).
    state = editVisit(state, 4, 90)

    expect(state.currentLeg.visits[6].bust).toBe(false)
    expect(state.currentLeg.visits[6].checkout).toBe(false)
    expect(state.currentLeg.visits[6].remaining).toBe(10)
    expect(state.currentLeg.remaining[0]).toBe(10)
    expect(state.lastBust).toBe(false)
    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.winner).toBe(null)
  })

  it('refuses edits that would check out the leg via a later visit', () => {
    let state = createMatch(baseConfig)
    // Player0 is set up so a later visit scores 40, but only becomes a checkout after editing.
    state = submitVisit(state, 180) // p0 -> 321
    state = submitVisit(state, 60) // p1 -> 441
    state = submitVisit(state, 180) // p0 -> 141
    state = submitVisit(state, 60) // p1 -> 381
    state = submitVisit(state, 96) // p0 -> 45
    state = submitVisit(state, 60) // p1 -> 321
    state = submitVisit(state, 40) // p0 -> 5 (not checkout)

    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.winner).toBe(null)
    expect(state.currentLeg.remaining[0]).toBe(5)

    const before = state
    state = editVisit(state, 4, 101) // 96 -> 101 would make final 40 a checkout

    expect(state).toBe(before)
    expect(state.pendingLegWinner).toBe(null)
    expect(state.currentLeg.remaining[0]).toBe(5)
  })

  it('refuses edits that would move checkout earlier and truncate later visits', () => {
    let state = createMatch(baseConfig)
    // Original: checkout happens on the last visit (index 8).
    state = submitVisit(state, 180) // p0 -> 321
    state = submitVisit(state, 60) // p1 -> 441
    state = submitVisit(state, 180) // p0 -> 141
    state = submitVisit(state, 60) // p1 -> 381
    state = submitVisit(state, 97) // p0 -> 44
    state = submitVisit(state, 60) // p1 -> 321
    state = submitVisit(state, 40) // p0 -> 4 (not checkout)
    state = submitVisit(state, 60) // p1 -> 261
    state = submitVisit(state, 4) // p0 -> 0 checkout, pendingLegWinner set

    expect(state.pendingLegWinner).toBe(0)
    expect(state.currentLeg.visits).toHaveLength(9)

    const before = state
    // Editing 97 -> 101 would checkout earlier (index 6) and drop later visits.
    state = editVisit(state, 4, 101)

    expect(state).toBe(before)
    expect(state.currentLeg.visits).toHaveLength(9)
  })

  it('refuses edits that would newly bust the latest visit', () => {
    let state = createMatch(baseConfig)
    state = submitVisit(state, 180) // p0 -> 321
    state = submitVisit(state, 60) // p1 -> 441
    state = submitVisit(state, 180) // p0 -> 141
    state = submitVisit(state, 60) // p1 -> 381
    state = submitVisit(state, 90) // p0 -> 51
    state = submitVisit(state, 60) // p1 -> 321
    state = submitVisit(state, 41) // p0 -> 10 (legal)

    expect(state.currentLeg.visits[6].bust).toBe(false)
    expect(state.currentLeg.remaining[0]).toBe(10)

    const before = state
    // Raising 90 → 101 leaves 40 before the latest visit, so 41 becomes a bust.
    state = editVisit(state, 4, 101)

    expect(state).toBe(before)
    expect(state.currentLeg.remaining[0]).toBe(10)
    expect(state.currentLeg.visits[6].bust).toBe(false)
  })

  it('ignores impossible three-dart totals when editing', () => {
    let state = createMatch(baseConfig)
    state = submitVisit(state, 60)
    const before = state
    state = editVisit(state, 0, 179)
    expect(state).toBe(before)
    expect(state.currentLeg.visits[0].scored).toBe(60)
  })
})

describe('practice mode', () => {
  const practiceConfig: MatchConfig = {
    gameType: 'x01',
    playMode: 'practice',
    playerNames: ['Solo', ''],
    startingScore: 501,
    mode: 'first-to',
    legsTarget: 1,
    setsMode: 'first-to',
    setsTarget: 1,
    firstThrower: 0,
    game121Increment: 1,
    game121DartsAllowed: 9,
  }

  it('keeps currentPlayer on 0 after a normal visit', () => {
    let state = createMatch(practiceConfig)
    state = submitVisit(state, 60)
    expect(state.currentLeg.currentPlayer).toBe(0)
    expect(state.currentLeg.remaining[0]).toBe(441)
    expect(state.currentLeg.remaining[1]).toBe(501)
  })

  it('never sets matchWinner on confirmLeg', () => {
    let state = createMatch(practiceConfig)
    state = {
      ...state,
      currentLeg: {
        ...state.currentLeg,
        remaining: [40, 501],
        visits: [],
      },
    }
    state = submitVisit(state, 40)
    expect(state.pendingLegWinner).toBe(0)
    state = confirmLeg(state)
    expect(state.matchWinner).toBeNull()
    expect(state.setsWon).toEqual([0, 0])
    expect(state.legsWon[0]).toBe(1)
    expect(state.pendingLegWinner).toBeNull()
    expect(state.currentLeg.remaining[0]).toBe(501)
    expect(state.currentLeg.currentPlayer).toBe(0)
  })

  it('keeps currentPlayer on 0 after editing a visit', () => {
    let state = createMatch(practiceConfig)
    state = submitVisit(state, 25)
    state = submitVisit(state, 25)
    expect(state.currentLeg.currentPlayer).toBe(0)

    state = editVisit(state, 0, 30)
    expect(state.currentLeg.currentPlayer).toBe(0)
    expect(state.currentLeg.remaining[0]).toBe(446)
    expect(state.currentLeg.visits).toHaveLength(2)
    expect(state.currentLeg.visits.every((v) => v.player === 0)).toBe(true)
  })
})

describe('121 game', () => {
  const game121Config: MatchConfig = {
    gameType: '121',
    playMode: 'practice',
    playerNames: ['Solo', ''],
    startingScore: 121,
    mode: 'first-to',
    legsTarget: 1,
    setsMode: 'first-to',
    setsTarget: 1,
    firstThrower: 0,
    game121Increment: 1,
    game121DartsAllowed: 9,
  }

  it('starts at 121 and advances after a checkout', () => {
    let state = createMatch(game121Config)
    expect(state.currentLeg.remaining[0]).toBe(121)
    expect(state.game121?.targets[0]).toBe(121)

    state = submitVisit(state, 121)

    expect(state.game121?.targets[0]).toBe(122)
    expect(state.game121?.lockedBases[0]).toBe(121)
    expect(state.currentLeg.remaining[0]).toBe(122)
    expect(state.legsWon[0]).toBe(1)
    expect(state.completedLegs).toHaveLength(1)
    expect(state.completedLegs[0].visits[0].dartsUsed).toBe(3)
    expect(state.pendingLegWinner).toBe(null)
  })

  it('advances by the configured increment after a checkout', () => {
    let state = createMatch({
      ...game121Config,
      game121Increment: 5,
    })

    state = submitVisit(state, 121)

    expect(state.game121?.targets[0]).toBe(126)
    expect(state.currentLeg.remaining[0]).toBe(126)
  })

  it('fails after the configured dart allowance', () => {
    let state = createMatch({
      ...game121Config,
      game121DartsAllowed: 6,
    })

    state = submitVisit(state, 0)
    expect(state.currentLeg.visits).toHaveLength(1)
    state = submitVisit(state, 0)

    expect(state.completedLegs).toHaveLength(1)
    expect(state.currentLeg.visits).toHaveLength(0)
    expect(state.currentLeg.remaining[0]).toBe(121)
  })

  it('drops only to the locked base after a failed 9-dart attempt', () => {
    let state = createMatch(game121Config)
    state = submitVisit(state, 121)
    expect(state.game121?.targets[0]).toBe(122)

    state = submitVisit(state, 0)
    state = submitVisit(state, 0)
    state = submitVisit(state, 0)

    expect(state.game121?.targets[0]).toBe(121)
    expect(state.currentLeg.remaining[0]).toBe(121)
    expect(state.completedLegs).toHaveLength(2)
  })

  it('does not lock the base for checkouts after the first visit', () => {
    let state = createMatch(game121Config)
    state = {
      ...state,
      game121: {
        targets: [127, 121],
        lockedBases: [121, 121],
      },
      currentLeg: createLeg(127, 0),
    }

    state = submitVisit(state, 60)
    state = submitVisit(state, 67)

    expect(state.game121?.targets[0]).toBe(128)
    expect(state.game121?.lockedBases[0]).toBe(121)
  })

  it('forces 121 to shared-score solo even when given matchplay config', () => {
    let state = createMatch({
      ...game121Config,
      playMode: 'matchplay',
      playerNames: ['Alice', 'Bob'],
    })

    expect(state.config.playMode).toBe('practice')
    expect(state.config.playerNames).toEqual(['Alice', ''])

    state = submitVisit(state, 0)
    expect(state.currentLeg.currentPlayer).toBe(0)
    state = submitVisit(state, 0)
    state = submitVisit(state, 0)

    expect(state.currentLeg.currentPlayer).toBe(0)
    expect(state.currentLeg.remaining).toEqual([121, 121])
  })

  it('keeps the active player after editing a 121 attempt visit', () => {
    let state = createMatch(game121Config)

    state = submitVisit(state, 60)
    state = editVisit(state, 0, 57)

    expect(state.currentLeg.currentPlayer).toBe(0)
    expect(state.currentLeg.remaining[0]).toBe(64)
  })
})
