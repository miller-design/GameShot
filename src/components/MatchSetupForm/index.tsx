import clsx from 'clsx'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useMatch } from '#/store/match'
import type { MatchConfig, MatchMode, PlayerIndex, StartingScore } from '#/types/match'

import styles from './styles.module.css'

type MatchSetupFormProps = {
  className?: string
}

/**
 * Match setup form — names, format, legs, who throws first.
 *
 * @param props.className - Optional class on the form root
 *
 * @example
 * <MatchSetupForm />
 */
const MatchSetupForm = ({ className }: MatchSetupFormProps) => {
  const { startMatch } = useMatch()
  const navigate = useNavigate()

  const [player1, setPlayer1] = useState('Player 1')
  const [player2, setPlayer2] = useState('Player 2')
  const [startingScore, setStartingScore] = useState<StartingScore>(501)
  const [mode, setMode] = useState<MatchMode>('best-of')
  const [legsTarget, setLegsTarget] = useState<number | ''>(5)
  const [firstThrower, setFirstThrower] = useState<PlayerIndex>(0)

  /**
   * Validates and starts a match, then navigates to the board.
   *
   * @param event - Form submit event
   *
   * @example
   * <form onSubmit={handleSubmit}>
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name1 = player1.trim() || 'Player 1'
    const name2 = player2.trim() || 'Player 2'
    const legs = Math.max(1, Math.min(21, Math.floor(Number(legsTarget) || 1)))

    const config: MatchConfig = {
      playerNames: [name1, name2],
      startingScore,
      mode,
      legsTarget: legs,
      firstThrower,
    }

    startMatch(config)
    void navigate({ to: '/match' })
  }

  return (
    <form className={clsx(styles.root, className)} onSubmit={handleSubmit}>
      <div className={styles.eyebrow}>New match</div>
      <h1 className={styles.title}>GameShot</h1>
      <p className={styles.lede}>Set up a 501, 701 or 1001 matchplay game.</p>

      <fieldset className={styles.field}>
        <legend>Players</legend>
        <div className={styles.row}>
          <label className={styles.label}>
            Player 1
            <input
              type="text"
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <label className={styles.label}>
            Player 2
            <input
              type="text"
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend>Starting score</legend>
        <div className={styles.segment}>
          {([501, 701, 1001] as StartingScore[]).map((score) => (
            <button
              key={score}
              type="button"
              className={clsx(styles.segmentBtn, startingScore === score && styles.segmentActive)}
              onClick={() => setStartingScore(score)}
            >
              {score}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend>Match format</legend>
        <div className={styles.segment}>
          <button
            type="button"
            className={clsx(styles.segmentBtn, mode === 'first-to' && styles.segmentActive)}
            onClick={() => setMode('first-to')}
          >
            First to
          </button>
          <button
            type="button"
            className={clsx(styles.segmentBtn, mode === 'best-of' && styles.segmentActive)}
            onClick={() => setMode('best-of')}
          >
            Best of
          </button>
        </div>
        <label className={styles.label}>
          Legs
          <input
            type="number"
            min={1}
            max={21}
            value={legsTarget}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                setLegsTarget('')
                return
              }
              const parsed = Number(raw)
              if (!Number.isNaN(parsed)) setLegsTarget(parsed)
            }}
          />
        </label>
      </fieldset>

      <fieldset className={styles.field}>
        <legend>First throw</legend>
        <div className={styles.segment}>
          <button
            type="button"
            className={clsx(styles.segmentBtn, firstThrower === 0 && styles.segmentActive)}
            onClick={() => setFirstThrower(0)}
          >
            {player1.trim() || 'Player 1'}
          </button>
          <button
            type="button"
            className={clsx(styles.segmentBtn, firstThrower === 1 && styles.segmentActive)}
            onClick={() => setFirstThrower(1)}
          >
            {player2.trim() || 'Player 2'}
          </button>
        </div>
      </fieldset>

      <button type="submit" className={styles.submit}>
        Start match
      </button>
    </form>
  )
}

export default MatchSetupForm
