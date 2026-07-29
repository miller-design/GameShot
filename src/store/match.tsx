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
  undoVisit as undoVisitPure,
} from '#/lib/darts/scoring'
import type { MatchConfig, MatchState } from '#/types/match'

const STORAGE_KEY = 'gameshot-match'

type MatchContextValue = {
  match: MatchState | null
  hydrated: boolean
  startMatch: (config: MatchConfig) => void
  submitVisit: (scored: number) => void
  editVisit: (visitIndex: number, scored: number) => void
  undo: () => void
  confirmLeg: () => void
  clearMatch: () => void
  clearBustFlag: () => void
}

const MatchContext = createContext<MatchContextValue | null>(null)

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
    return JSON.parse(raw) as MatchState
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
   * startMatch({ playerNames: ['A','B'], startingScore: 501, mode: 'best-of', legsTarget: 5, firstThrower: 0 })
   */
  const startMatch = useCallback((config: MatchConfig) => {
    const next = createMatch(config)
    setMatch(next)
    persistMatch(next)
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
      const next = submitVisitPure(prev, scored)
      persistMatch(next)
      return next
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
      const next = editVisitPure(prev, visitIndex, scored)
      persistMatch(next)
      return next
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
      const next = undoVisitPure(prev)
      persistMatch(next)
      return next
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
      const next = confirmLegPure(prev)
      persistMatch(next)
      return next
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
    persistMatch(null)
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
      const next = { ...prev, lastBust: false }
      persistMatch(next)
      return next
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
