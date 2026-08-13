import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import {
  confirmLeg as confirmLegPure,
  createMatch,
  editVisit as editVisitPure,
  submitVisit as submitVisitPure,
  setPendingLegCheckoutDartsUsed as setPendingLegCheckoutDartsUsedPure,
  undoVisit as undoVisitPure,
} from '#/lib/darts/scoring'
import type {
  Game121DartsAllowed,
  GameType,
  MatchConfig,
  MatchState,
  PlayMode,
} from '#/types/match'

const STORAGE_KEY = 'gameshot-match'

type MatchContextValue = {
  match: MatchState | null
  hydrated: boolean
  startMatch: (config: MatchConfig) => void
  submitVisit: (scored: number) => void
  editVisit: (visitIndex: number, scored: number) => void
  undo: () => void
  confirmLeg: () => void
  setPendingLegCheckoutDartsUsed: (dartsUsed: 1 | 2 | 3) => void
  clearMatch: () => void
  clearBustFlag: () => void
}

const MatchContext = createContext<MatchContextValue | null>(null)

const VALID_PLAY_MODES: ReadonlySet<PlayMode> = new Set([
  'matchplay',
  'practice',
])
const VALID_GAME_TYPES: ReadonlySet<GameType> = new Set(['x01', '121'])
const VALID_121_DARTS_ALLOWED: ReadonlySet<Game121DartsAllowed> = new Set([
  6, 9, 12,
])

/**
 * Normalizes persisted match JSON so older sessions without playMode still load.
 *
 * @param raw - Parsed sessionStorage value
 * @returns MatchState with defaults applied, or null if unusable
 *
 * @example
 * normalizeStoredMatch(JSON.parse(raw))
 */
function normalizeStoredMatch(raw: unknown): MatchState | null {
  if (!raw || typeof raw !== 'object') return null
  const state = raw as Partial<MatchState>
  if (!state.config || typeof state.config !== 'object') return null
  const config = state.config as Partial<MatchConfig>

  const playMode = VALID_PLAY_MODES.has(config.playMode as PlayMode)
    ? (config.playMode as PlayMode)
    : 'matchplay'
  const gameType = VALID_GAME_TYPES.has(config.gameType as GameType)
    ? (config.gameType as GameType)
    : 'x01'
  const game121DartsAllowed = VALID_121_DARTS_ALLOWED.has(
    config.game121DartsAllowed as Game121DartsAllowed,
  )
    ? (config.game121DartsAllowed as Game121DartsAllowed)
    : 9
  const game121Increment = Math.max(
    1,
    Math.min(49, Math.floor(Number(config.game121Increment) || 1)),
  )
  const playerNames: [string, string] =
    gameType === '121'
      ? [config.playerNames?.[0] || '121', '']
      : [
          config.playerNames?.[0] || 'Player 1',
          config.playerNames?.[1] || 'Player 2',
        ]

  return {
    ...state,
    config: {
      ...state.config,
      gameType,
      playMode: gameType === '121' ? 'practice' : playMode,
      playerNames,
      startingScore: gameType === '121' ? 121 : (config.startingScore ?? 501),
      mode: gameType === '121' ? 'first-to' : (config.mode ?? 'best-of'),
      legsTarget: gameType === '121' ? 1 : (config.legsTarget ?? 5),
      setsMode:
        gameType === '121' ? 'first-to' : (config.setsMode ?? 'first-to'),
      setsTarget: gameType === '121' ? 1 : (config.setsTarget ?? 1),
      firstThrower: gameType === '121' ? 0 : (config.firstThrower ?? 0),
      game121Increment,
      game121DartsAllowed,
    },
    setsWon: state.setsWon ?? [0, 0],
    game121: gameType === '121' ? (state.game121 ?? null) : null,
  } as MatchState
}

/**
 * Reads persisted match state from sessionStorage (client-only).
 *
 * @returns Parsed MatchState or null
 *
 * @example
 * loadStoredMatch()
 */
function loadStoredMatch(): MatchState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeStoredMatch(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

/**
 * Persists match state to sessionStorage.
 *
 * @param match - Match state or null to clear
 *
 * @example
 * persistMatch(state)
 */
function persistMatch(match: MatchState | null): void {
  if (typeof window === 'undefined') return
  if (match === null) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(match))
}

/**
 * Provides match state and scoring actions to the app tree.
 *
 * @param props.children - React children
 *
 * @example
 * <MatchProvider><App /></MatchProvider>
 */
export function MatchProvider({ children }: { children: ReactNode }) {
  const [match, setMatch] = useState<MatchState | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Prefer an in-memory match already started before hydration finishes
    setMatch((current) => current ?? loadStoredMatch())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persistMatch(match)
  }, [match, hydrated])

  /**
   * Starts a new match from setup config.
   *
   * @param config - Match setup choices
   *
   * @example
   * startMatch({
   *   gameType: 'x01',
   *   playMode: 'matchplay',
   *   playerNames: ['A','B'],
   *   startingScore: 501,
   *   mode: 'best-of',
   *   legsTarget: 5,
   *   firstThrower: 0,
   * })
   */
  const startMatch = useCallback((config: MatchConfig) => {
    const next = createMatch(config)
    // Persist immediately so a fast /match navigation cannot read a stale
    // empty session before the React effect runs.
    persistMatch(next)
    setMatch(next)
  }, [])

  /**
   * Submits a visit score for the current thrower.
   *
   * @param scored - Visit total 0–180
   *
   * @example
   * submitVisit(60)
   */
  const submitVisit = useCallback((scored: number) => {
    setMatch((prev) => {
      if (!prev) return prev
      return submitVisitPure(prev, scored)
    })
  }, [])

  /**
   * Edits a previously recorded visit score by index and replays the leg.
   *
   * @param visitIndex - Absolute index in `currentLeg.visits` (0-based)
   * @param scored - New visit total (0–180)
   */
  const editVisit = useCallback((visitIndex: number, scored: number) => {
    setMatch((prev) => {
      if (!prev) return prev
      return editVisitPure(prev, visitIndex, scored)
    })
  }, [])

  /**
   * Undoes the last visit in the current leg.
   *
   * @example
   * undo()
   */
  const undo = useCallback(() => {
    setMatch((prev) => {
      if (!prev) return prev
      return undoVisitPure(prev)
    })
  }, [])

  /**
   * Confirms a completed leg and advances or ends the match.
   *
   * @example
   * confirmLeg()
   */
  const confirmLeg = useCallback(() => {
    setMatch((prev) => {
      if (!prev) return prev
      return confirmLegPure(prev)
    })
  }, [])

  const setPendingLegCheckoutDartsUsed = useCallback((dartsUsed: 1 | 2 | 3) => {
    setMatch((prev) => {
      if (!prev) return prev
      return setPendingLegCheckoutDartsUsedPure(prev, dartsUsed)
    })
  }, [])

  /**
   * Clears the active match (exit / new match).
   *
   * @example
   * clearMatch()
   */
  const clearMatch = useCallback(() => {
    setMatch(null)
  }, [])

  /**
   * Clears the transient bust flash flag after animation.
   *
   * @example
   * clearBustFlag()
   */
  const clearBustFlag = useCallback(() => {
    setMatch((prev) => {
      if (!prev) return prev
      return { ...prev, lastBust: false }
    })
  }, [])

  const value = useMemo(
    () => ({
      match,
      hydrated,
      startMatch,
      submitVisit,
      editVisit,
      undo,
      confirmLeg,
      setPendingLegCheckoutDartsUsed,
      clearMatch,
      clearBustFlag,
    }),
    [
      match,
      hydrated,
      startMatch,
      submitVisit,
      editVisit,
      undo,
      confirmLeg,
      setPendingLegCheckoutDartsUsed,
      clearMatch,
      clearBustFlag,
    ],
  )

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>
}

/**
 * Accesses the match store. Must be used under MatchProvider.
 *
 * @returns Match context value
 *
 * @example
 * const { match, submitVisit } = useMatch()
 */
export function useMatch(): MatchContextValue {
  const ctx = useContext(MatchContext)
  if (!ctx) {
    throw new Error('useMatch must be used within MatchProvider')
  }
  return ctx
}
