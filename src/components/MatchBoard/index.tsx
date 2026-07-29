import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'

import MatchHeader from '#/components/MatchHeader'
import MatchResult from '#/components/MatchResult'
import MatchStats from '#/components/MatchStats'
import RemainingScores from '#/components/RemainingScores'
import ScoreHistory from '#/components/ScoreHistory'
import ScorePad from '#/components/ScorePad'
import { useMatch } from '#/store/match'
import {
  editWouldBustLatestVisit,
  editWouldCheckoutOtherVisit,
  previewEditVisit,
} from '#/lib/darts/scoring'
import type { MatchState } from '#/types/match'

import styles from './styles.module.css'

type MatchBoardProps = {
  match: MatchState
}

/** How long edit-rejection toasts stay visible. */
const EDIT_TOAST_MS = 5000

/**
 * Full match scoring board — history, remaining, pad, overlays.
 *
 * @param props.match - Active match state
 *
 * @example
 * <MatchBoard match={match} />
 */
const MatchBoard = ({ match }: MatchBoardProps) => {
  const { submitVisit, editVisit, undo, clearMatch, clearBustFlag } = useMatch()
  const navigate = useNavigate()
  const [statsOpen, setStatsOpen] = useState(false)
  const statsBtnRef = useRef<HTMLButtonElement>(null)
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
  const [editingVisitIndex, setEditingVisitIndex] = useState<number | null>(
    null,
  )

  const inputLocked =
    match.matchWinner !== null ||
    (match.pendingLegWinner !== null && editingVisitIndex === null)

  /**
   * Clears any active edit-rejection toast.
   *
   * @example
   * clearEditError()
   */
  const clearEditError = useCallback(() => {
    setEditErrorMessage(null)
  }, [])

  /**
   * Submits a visit from the score pad.
   *
   * @param scored - Visit total 0–180
   * @returns false when an edit is rejected (toast shown); true otherwise
   *
   * @example
   * handleSubmit(60)
   */
  const handleSubmit = useCallback(
    (scored: number) => {
      if (editingVisitIndex === null) {
        clearEditError()
        submitVisit(scored)
        return true
      }

      const preview = previewEditVisit(match, editingVisitIndex, scored)

      if (editWouldCheckoutOtherVisit(match, editingVisitIndex, preview)) {
        setEditErrorMessage(
          'Update canceled: editing this score would check out the leg. Fix scores only — enter the finish on a normal turn.',
        )
        return false
      }

      if (editWouldBustLatestVisit(match, preview)) {
        setEditErrorMessage(
          'Update canceled: this edit would make the latest visit a bust. Choose a different score.',
        )
        return false
      }

      clearEditError()
      editVisit(editingVisitIndex, scored)
      setEditingVisitIndex(null)
      return true
    },
    [clearEditError, editVisit, editingVisitIndex, match, submitVisit],
  )

  useEffect(() => {
    if (editErrorMessage === null) return
    const t = window.setTimeout(clearEditError, EDIT_TOAST_MS)
    return () => window.clearTimeout(t)
  }, [clearEditError, editErrorMessage])

  /**
   * Selects a visit for editing, or clears selection if tapped again.
   *
   * @param visitIndex - Absolute visit index in the current leg
   *
   * @example
   * handleEditVisit(2)
   */
  const handleEditVisit = useCallback((visitIndex: number) => {
    clearEditError()
    setEditingVisitIndex((current) =>
      current === visitIndex ? null : visitIndex,
    )
  }, [clearEditError])

  /**
   * Cancels the active edit (e.g. when tapping the next-throw input cell).
   *
   * @example
   * handleCancelEdit()
   */
  const handleCancelEdit = useCallback(() => {
    clearEditError()
    setEditingVisitIndex(null)
  }, [clearEditError])

  /**
   * Exits the match and returns to setup.
   *
   * @example
   * handleExit()
   */
  function handleExit() {
    clearEditError()
    setEditingVisitIndex(null)
    clearMatch()
    void navigate({ to: '/' })
  }

  /**
   * Closes the stats sheet and clears the Stats button pressed/focus state.
   *
   * @example
   * handleCloseStats()
   */
  function handleCloseStats() {
    setStatsOpen(false)
    statsBtnRef.current?.blur()
  }

  return (
    <div className={styles.root}>
      <section className={styles.scoresZone} aria-label="Scores">
        <MatchHeader match={match} />
        <RemainingScores
          match={match}
          bustFlash={match.lastBust}
          onBustFlashEnd={clearBustFlag}
        />
        <ScoreHistory
          match={match}
          editingVisitIndex={editingVisitIndex}
          onEditVisit={handleEditVisit}
          onCancelEdit={handleCancelEdit}
        />
      </section>

      <section className={styles.uiZone} aria-label="Scoring controls">
        <nav className={styles.toolbar} aria-label="Match actions">
          {editingVisitIndex !== null ? (
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => {
                clearEditError()
                setEditingVisitIndex(null)
              }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className={styles.toolBtn}
              onClick={undo}
              disabled={
                match.currentLeg.visits.length === 0 ||
                match.matchWinner !== null
              }
            >
              Undo
            </button>
          )}
          <button
            ref={statsBtnRef}
            type="button"
            className={clsx(styles.toolBtn, statsOpen && styles.toolBtnActive)}
            aria-pressed={statsOpen}
            onClick={() => setStatsOpen(true)}
          >
            Stats
          </button>
          <button type="button" className={styles.toolBtn} onClick={handleExit}>
            Exit
          </button>
        </nav>

        <ScorePad
          disabled={inputLocked}
          mode={editingVisitIndex === null ? 'entry' : 'edit'}
          prefillScore={
            editingVisitIndex === null
              ? null
              : (match.currentLeg.visits[editingVisitIndex]?.scored ?? null)
          }
          onSubmit={handleSubmit}
          errorMessage={editingVisitIndex === null ? null : editErrorMessage}
          onBufferChange={
            editingVisitIndex === null ? undefined : clearEditError
          }
        />
      </section>

      <MatchStats match={match} open={statsOpen} onClose={handleCloseStats} />
      <MatchResult match={match} />
    </div>
  )
}

export default MatchBoard
