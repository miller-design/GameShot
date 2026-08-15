import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'

import MatchHeader from '#/components/MatchHeader'
import MatchResult from '#/components/MatchResult'
import MatchStats from '#/components/MatchStats'
import RemainingScores from '#/components/RemainingScores'
import ScoreHistory from '#/components/ScoreHistory'
import ScorePad from '#/components/ScorePad'
import {
  editWouldBustLatestVisit,
  editWouldCheckoutOtherVisit,
  previewEditVisit,
} from '#/lib/darts/scoring'
import { useMatch } from '#/store/match'
import type { MatchState, PlayerIndex } from '#/types/match'

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
  const {
    submitVisit,
    editVisit,
    undo,
    clearMatch,
    clearBustFlag,
    setLegThrower,
  } = useMatch()
  const navigate = useNavigate()
  const [statsOpen, setStatsOpen] = useState(false)
  const statsBtnRef = useRef<HTMLButtonElement>(null)
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
  const [scoreBuffer, setScoreBuffer] = useState('')
  const [editingVisitIndex, setEditingVisitIndex] = useState<number | null>(
    null,
  )

  const inputLocked =
    match.matchWinner !== null ||
    (match.pendingLegWinner !== null && editingVisitIndex === null) ||
    statsOpen

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
   * Tracks score-pad input for live preview in the history grid.
   *
   * @param buffer - Current score pad digit buffer
   *
   * @example
   * handleBufferChange('60')
   */
  const handleBufferChange = useCallback(
    (buffer: string) => {
      setScoreBuffer(buffer)
      if (editingVisitIndex !== null) {
        clearEditError()
      }
    },
    [clearEditError, editingVisitIndex],
  )

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
        setScoreBuffer('')
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
      setScoreBuffer('')
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
  const handleEditVisit = useCallback(
    (visitIndex: number) => {
      clearEditError()
      if (editingVisitIndex === visitIndex) {
        setEditingVisitIndex(null)
        setScoreBuffer('')
        return
      }
      setEditingVisitIndex(visitIndex)
    },
    [clearEditError, editingVisitIndex],
  )

  /**
   * Cancels the active edit (e.g. when tapping the next-throw input cell).
   *
   * @example
   * handleCancelEdit()
   */
  const handleCancelEdit = useCallback(() => {
    clearEditError()
    setEditingVisitIndex(null)
    setScoreBuffer('')
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
   * Used by Close, Escape, backdrop click, and swipe-to-dismiss.
   *
   * @example
   * handleCloseStats()
   */
  function handleCloseStats() {
    setStatsOpen(false)
    // Blur immediately and again after the sheet unmounts — browsers often
    // restore focus to the Stats trigger when the Close control is removed.
    const clearFocus = () => {
      statsBtnRef.current?.blur()
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur()
      }
    }
    clearFocus()
    window.requestAnimationFrame(clearFocus)
  }

  const canPickThrower =
    match.config.playMode === 'matchplay' &&
    match.config.gameType !== '121' &&
    match.matchWinner === null &&
    match.pendingLegWinner === null &&
    match.currentLeg.visits.length === 0

  /**
   * Chooses who throws first on an empty leg (match start or new set/leg).
   *
   * @param player - Player index tapped in the header
   *
   * @example
   * handleSelectThrower(1)
   */
  function handleSelectThrower(player: PlayerIndex) {
    setLegThrower(player)
  }

  return (
    <div className={styles.root}>
      <section className={styles.scoresZone} aria-label="Scores">
        <MatchHeader
          match={match}
          onSelectThrower={canPickThrower ? handleSelectThrower : undefined}
        />
        <ScoreHistory
          match={match}
          editingVisitIndex={editingVisitIndex}
          onEditVisit={handleEditVisit}
          onCancelEdit={handleCancelEdit}
          inputBuffer={scoreBuffer}
        />
        <RemainingScores
          match={match}
          bustFlash={match.lastBust}
          onBustFlashEnd={clearBustFlag}
          inputBuffer={editingVisitIndex === null ? scoreBuffer : ''}
        />
      </section>

      <section className={styles.uiZone} aria-label="Scoring controls">
        <nav className={styles.toolbar} aria-label="Match actions">
          {editingVisitIndex !== null ? (
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleCancelEdit}
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
          onBufferChange={handleBufferChange}
        />
      </section>

      <MatchStats match={match} open={statsOpen} onClose={handleCloseStats} />
      <MatchResult match={match} />
    </div>
  )
}

export default MatchBoard
