import clsx from 'clsx'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useMatch } from '#/store/match'
import type {
  Game121DartsAllowed,
  GameType,
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

  const [gameType, setGameType] = useState<GameType>('x01')
  const [playMode, setPlayMode] = useState<PlayMode>('matchplay')
  const [player1, setPlayer1] = useState('Player 1')
  const [player2, setPlayer2] = useState('Player 2')
  const [startingScore, setStartingScore] = useState<StartingScore>(501)
  const [game121Increment, setGame121Increment] = useState<number | ''>(1)
  const [game121DartsAllowed, setGame121DartsAllowed] =
    useState<Game121DartsAllowed>(9)
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
    const is121 = gameType === '121'
    const name1 = is121 ? '121' : player1.trim() || 'Player 1'
    const legs = Math.max(1, Math.min(21, Math.floor(Number(legsTarget) || 1)))
    const increment = Math.max(
      1,
      Math.min(49, Math.floor(Number(game121Increment) || 1)),
    )

    let config: MatchConfig

    if (is121) {
      config = {
        gameType: '121',
        playMode: 'practice',
        playerNames: [name1, ''],
        startingScore: 121,
        mode: 'first-to',
        legsTarget: 1,
        firstThrower: 0,
        game121Increment: increment,
        game121DartsAllowed,
      }
    } else if (playMode === 'practice') {
      config = {
        gameType,
        playMode: 'practice',
        playerNames: [name1, ''],
        startingScore,
        mode: 'first-to',
        legsTarget: 1,
        firstThrower: 0,
        game121Increment: increment,
        game121DartsAllowed,
      }
    } else {
      const name2 = player2.trim() || 'Player 2'
      config = {
        gameType,
        playMode: 'matchplay',
        playerNames: [name1, name2],
        startingScore,
        mode,
        legsTarget: legs,
        firstThrower,
        game121Increment: increment,
        game121DartsAllowed,
      }
    }

    startMatch(config)
    void navigate({ to: '/match' })
  }

  const opponentLabel = player2.trim() || 'Player 2'

  return (
    <form className={clsx(styles.root, className)} onSubmit={handleSubmit}>
      <fieldset className={styles.field}>
        <legend className={styles.legend}>Game</legend>
        <div className={styles.segment}>
          {(
            [
              ['x01', '501 / X01'],
              ['121', '121'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={clsx(
                styles.segmentBtn,
                gameType === value && styles.segmentActive,
              )}
              onClick={() => setGameType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {gameType === 'x01' ? (
        <fieldset className={styles.field}>
          <legend className={styles.legend}>Play mode</legend>
          <div className={styles.segment}>
            {(
              [
                ['matchplay', 'Matchplay'],
                ['practice', 'Practice'],
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
      ) : null}

      {gameType === 'x01' ? (
        <fieldset className={styles.field}>
          <legend className={styles.legend}>
            {playMode === 'practice' ? 'Player' : 'Players'}
          </legend>
          <div className={styles.row}>
            <label className={clsx(styles.label, styles.playerLabel)}>
              {playMode === 'practice' ? 'You' : 'Player 1'}
              <input
                type="text"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                maxLength={24}
                autoComplete="off"
              />
            </label>
            {playMode === 'matchplay' ? (
              <label className={clsx(styles.label, styles.playerLabel)}>
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
      ) : null}

      {gameType === 'x01' ? (
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
      ) : null}

      {gameType === '121' ? (
        <>
          <fieldset className={clsx(styles.field, styles.formatField)}>
            <legend className={styles.legend}>Target increase</legend>
            <div className={styles.segment}>
              <input
                type="number"
                className={styles.legsInput}
                aria-label="121 target increase"
                min={1}
                max={49}
                value={game121Increment}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setGame121Increment('')
                    return
                  }
                  const parsed = Number(raw)
                  if (!Number.isNaN(parsed)) setGame121Increment(parsed)
                }}
              />
            </div>
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.legend}>Darts allowed</legend>
            <div className={styles.segment}>
              {([6, 9, 12] as Game121DartsAllowed[]).map((darts) => (
                <button
                  key={darts}
                  type="button"
                  className={clsx(
                    styles.segmentBtn,
                    game121DartsAllowed === darts && styles.segmentActive,
                  )}
                  onClick={() => setGame121DartsAllowed(darts)}
                >
                  {darts}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      {playMode !== 'practice' && gameType === 'x01' ? (
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
                {player1.trim() || 'Player 1'}
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
        {gameType === '121'
          ? 'Start 121'
          : playMode === 'practice'
            ? 'Start practice'
            : 'Start match'}
      </button>
    </form>
  )
}

export default MatchSetupForm
