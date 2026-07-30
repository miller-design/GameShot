import clsx from 'clsx'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useMatch } from '#/store/match'
import type {
  BotDifficulty,
  MatchConfig,
  MatchMode,
  PlayerIndex,
  PlayMode,
  StartingScore,
} from '#/types/match'

import styles from './styles.module.css'

type MatchSetupFormProps = {
  className?: string
}

/**
 * Match setup form — play mode, names, format, legs, who throws first.
 *
 * @param props.className - Optional class on the form root
 *
 * @example
 * <MatchSetupForm />
 */
const MatchSetupForm = ({ className }: MatchSetupFormProps) => {
  const { startMatch } = useMatch()
  const navigate = useNavigate()

  const [playMode, setPlayMode] = useState<PlayMode>('matchplay')
  const [player1, setPlayer1] = useState('Player 1')
  const [player2, setPlayer2] = useState('Player 2')
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium')
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
    const legs = Math.max(1, Math.min(21, Math.floor(Number(legsTarget) || 1)))

    let config: MatchConfig

    if (playMode === 'practice') {
      config = {
        playMode: 'practice',
        playerNames: [name1, ''],
        startingScore,
        mode: 'first-to',
        legsTarget: 1,
        firstThrower: 0,
      }
    } else if (playMode === 'vs-computer') {
      config = {
        playMode: 'vs-computer',
        playerNames: [name1, 'Computer'],
        startingScore,
        mode,
        legsTarget: legs,
        firstThrower,
        botDifficulty,
      }
    } else {
      const name2 = player2.trim() || 'Player 2'
      config = {
        playMode: 'matchplay',
        playerNames: [name1, name2],
        startingScore,
        mode,
        legsTarget: legs,
        firstThrower,
      }
    }

    startMatch(config)
    void navigate({ to: '/match' })
  }

  const opponentLabel =
    playMode === 'vs-computer' ? 'Computer' : player2.trim() || 'Player 2'

  return (
    <form className={clsx(styles.root, className)} onSubmit={handleSubmit}>
      <div className={styles.eyebrow}>New match</div>
      <div>
        <h1 className={styles.title}>GameShot</h1>
        <p className={styles.lede}>
          {playMode === 'practice'
            ? 'Solo practice — endless legs, no opponent.'
            : playMode === 'vs-computer'
              ? 'Play matchplay against the computer.'
              : 'Set up a 501, 701 or 1001 matchplay game.'}
        </p>
      </div>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>Play mode</legend>
        <div className={styles.segment}>
          {(
            [
              ['matchplay', 'Matchplay'],
              ['practice', 'Practice'],
              ['vs-computer', 'Vs Computer'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={clsx(
                styles.segmentBtn,
                playMode === value && styles.segmentActive,
              )}
              onClick={() => setPlayMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>
          {playMode === 'practice' ? 'Player' : 'Players'}
        </legend>
        <div className={styles.row}>
          <label className={styles.label}>
            {playMode === 'vs-computer' || playMode === 'practice'
              ? 'You'
              : 'Player 1'}
            <input
              type="text"
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          {playMode === 'matchplay' ? (
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
          ) : null}
        </div>
      </fieldset>

      {playMode === 'vs-computer' ? (
        <fieldset className={styles.field}>
          <legend className={styles.legend}>Computer level</legend>
          <div className={styles.segment}>
            {(
              [
                ['easy', 'Easy'],
                ['medium', 'Medium'],
                ['hard', 'Hard'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  botDifficulty === value && styles.segmentActive,
                )}
                onClick={() => setBotDifficulty(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className={styles.field}>
        <legend className={styles.legend}>Starting score</legend>
        <div className={styles.segment}>
          {([501, 701, 1001] as StartingScore[]).map((score) => (
            <button
              key={score}
              type="button"
              className={clsx(
                styles.segmentBtn,
                startingScore === score && styles.segmentActive,
              )}
              onClick={() => setStartingScore(score)}
            >
              {score}
            </button>
          ))}
        </div>
      </fieldset>

      {playMode !== 'practice' ? (
        <>
          <fieldset className={clsx(styles.field, styles.formatField)}>
            <legend className={styles.legend}>Match format</legend>
            <div className={styles.segment}>
              <input
                type="number"
                className={styles.legsInput}
                aria-label="Legs"
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
              <button
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  mode === 'first-to' && styles.segmentActive,
                )}
                onClick={() => setMode('first-to')}
              >
                First to
              </button>
              <button
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  mode === 'best-of' && styles.segmentActive,
                )}
                onClick={() => setMode('best-of')}
              >
                Best of
              </button>
            </div>
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.legend}>First throw</legend>
            <div className={styles.segment}>
              <button
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  firstThrower === 0 && styles.segmentActive,
                )}
                onClick={() => setFirstThrower(0)}
              >
                {player1.trim() ||
                  (playMode === 'vs-computer' ? 'You' : 'Player 1')}
              </button>
              <button
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  firstThrower === 1 && styles.segmentActive,
                )}
                onClick={() => setFirstThrower(1)}
              >
                {opponentLabel}
              </button>
            </div>
          </fieldset>
        </>
      ) : null}

      <button type="submit" className={styles.submit}>
        {playMode === 'practice' ? 'Start practice' : 'Start match'}
      </button>
    </form>
  )
}

export default MatchSetupForm
