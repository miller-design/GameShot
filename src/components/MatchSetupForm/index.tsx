import clsx from 'clsx'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'

import { useMatch } from '#/store/match'
import type {
  Game121DartsAllowed,
  GameType,
  MatchConfig,
  MatchMode,
  PlayMode,
  StartingScore,
} from '#/types/match'

import styles from './styles.module.css'

const X01_SCORES: StartingScore[] = [501, 701, 1001]

type MatchSetupFormProps = {
  className?: string
}

type FormatRowProps = {
  label?: string
  ariaLabel: string
  target: number | ''
  mode: MatchMode
  onTargetChange: (value: number | '') => void
  onModeChange: (mode: MatchMode) => void
}

type PlayerFieldProps = {
  value: string
  placeholder: string
  onNameChange: (value: string) => void
}

/**
 * Parses a number input, allowing the field to be cleared while typing.
 *
 * @param raw - The input element's current string value
 *
 * @example
 * parseTargetInput('3') // 3
 * parseTargetInput('') // ''
 */
function parseTargetInput(raw: string) {
  if (raw === '') return ''
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Bumps an even best-of target up to the next odd value (max 21).
 *
 * @param current - Target while editing, or empty
 *
 * @example
 * toOddBestOf(4) // 5
 */
function toOddBestOf(current: number | '') {
  return typeof current === 'number' && current % 2 === 0
    ? Math.min(21, current + 1)
    : current
}

/**
 * Name field for a player or practice user.
 *
 * @param props.value - Current name
 * @param props.placeholder - Empty-state text and accessible name
 * @param props.onNameChange - Called with the input value
 *
 * @example
 * <PlayerField
 *   value={player1}
 *   placeholder="Player 1"
 *   onNameChange={setPlayer1}
 * />
 */
function PlayerField({ value, placeholder, onNameChange }: PlayerFieldProps) {
  return (
    <input
      className={styles.playerField}
      type="text"
      value={value}
      onChange={(event) => onNameChange(event.target.value)}
      maxLength={24}
      autoComplete="off"
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )
}

/**
 * Number plus First to / Best of — used for both legs and sets.
 *
 * @param props.label - Optional row label, e.g. `"Legs per set"`
 * @param props.ariaLabel - Accessible name for the number input
 * @param props.target - Current target, or empty while the field is cleared
 * @param props.mode - Whether the number is first-to or best-of
 * @param props.onTargetChange - Called with the parsed input value
 * @param props.onModeChange - Called when First to / Best of is chosen
 *
 * @example
 * <FormatRow
 *   ariaLabel="Legs"
 *   target={3}
 *   mode="best-of"
 *   onTargetChange={setLegsTarget}
 *   onModeChange={setMode}
 * />
 */
function FormatRow({
  label,
  ariaLabel,
  target,
  mode,
  onTargetChange,
  onModeChange,
}: FormatRowProps) {
  const controls = (
    <div className={styles.segment}>
      <input
        type="number"
        className={styles.legsInput}
        aria-label={ariaLabel}
        min={1}
        max={21}
        step={mode === 'best-of' ? 2 : 1}
        value={target}
        onChange={(event) => {
          const parsed = parseTargetInput(event.target.value)
          if (parsed === null) return
          onTargetChange(parsed)
        }}
      />
      <button
        type="button"
        className={clsx(
          styles.segmentBtn,
          mode === 'first-to' && styles.segmentActive,
        )}
        onClick={() => onModeChange('first-to')}
      >
        First to
      </button>
      <button
        type="button"
        className={clsx(
          styles.segmentBtn,
          mode === 'best-of' && styles.segmentActive,
        )}
        onClick={() => {
          onModeChange('best-of')
          onTargetChange(toOddBestOf(target))
        }}
      >
        Best of
      </button>
    </div>
  )

  if (!label) return controls

  return (
    <label className={styles.formatLabel}>
      {label}
      {controls}
    </label>
  )
}

/**
 * Match setup form — game, names, and format.
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
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [startingScore, setStartingScore] = useState<StartingScore>(501)
  const [game121Increment, setGame121Increment] = useState<number | ''>(1)
  const [game121DartsAllowed, setGame121DartsAllowed] =
    useState<Game121DartsAllowed>(9)
  const [mode, setMode] = useState<MatchMode>('best-of')
  const [legsTarget, setLegsTarget] = useState<number | ''>(3)
  const [playSets, setPlaySets] = useState(false)
  const [setsMode, setSetsMode] = useState<MatchMode>('first-to')
  const [setsTarget, setSetsTarget] = useState<number | ''>(1)

  const isPractice = playMode === 'practice'
  const is121 = gameType === '121'
  const showMatchplayFields = !is121 && !isPractice

  const name1 = player1.trim() || (is121 ? '121' : 'Player 1')
  const name2 = player2.trim() || 'Player 2'

  /**
   * Picks X01 501/701/1001 or switches into 121.
   *
   * @param score - Starting score, or `'121'` for the checkout trainer
   *
   * @example
   * selectGame(501)
   * selectGame('121')
   */
  function selectGame(score: StartingScore | '121') {
    if (score === '121') {
      setGameType('121')
      return
    }
    setGameType('x01')
    setStartingScore(score)
  }

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
    const normalizeTarget = (target: number | '', targetMode: MatchMode) => {
      const value = Math.max(1, Math.min(21, Math.floor(Number(target) || 1)))
      return targetMode === 'best-of' && value % 2 === 0 ? value + 1 : value
    }
    const legs = normalizeTarget(legsTarget, mode)
    const sets = playSets ? normalizeTarget(setsTarget, setsMode) : 1
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
        setsMode: 'first-to',
        setsTarget: 1,
        firstThrower: 0,
        game121Increment: increment,
        game121DartsAllowed,
      }
    } else if (isPractice) {
      config = {
        gameType,
        playMode: 'practice',
        playerNames: [name1, ''],
        startingScore,
        mode: 'first-to',
        legsTarget: 1,
        setsMode: 'first-to',
        setsTarget: 1,
        firstThrower: 0,
        game121Increment: increment,
        game121DartsAllowed,
      }
    } else {
      config = {
        gameType,
        playMode: 'matchplay',
        playerNames: [name1, name2],
        startingScore,
        mode,
        legsTarget: legs,
        setsMode: playSets ? setsMode : 'first-to',
        setsTarget: sets,
        firstThrower: 0,
        game121Increment: increment,
        game121DartsAllowed,
      }
    }

    // Commit match state before navigating — otherwise /match can briefly
    // see `match === null`, redirect home, and remount this form at defaults.
    flushSync(() => {
      startMatch(config)
    })
    void navigate({ to: '/match' })
  }

  const submitLabel = is121
    ? 'Start 121'
    : isPractice
      ? `Start ${startingScore} practice`
      : `Start ${startingScore} match`

  return (
    <form className={clsx(styles.root, className)} onSubmit={handleSubmit}>
      <div className={styles.panel}>
        <fieldset className={styles.field}>
          <legend className={styles.legend}>Game</legend>
          <div className={styles.segment}>
            {X01_SCORES.map((score) => (
              <button
                key={score}
                type="button"
                className={clsx(
                  styles.segmentBtn,
                  !is121 && startingScore === score && styles.segmentActive,
                )}
                onClick={() => selectGame(score)}
              >
                {score}
              </button>
            ))}
            <button
              type="button"
              className={clsx(styles.segmentBtn, is121 && styles.segmentActive)}
              onClick={() => selectGame('121')}
            >
              121
            </button>
          </div>
        </fieldset>

        {is121 ? (
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
                  onChange={(event) => {
                    const parsed = parseTargetInput(event.target.value)
                    if (parsed === null) return
                    setGame121Increment(parsed)
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
        ) : (
          <>
            <fieldset className={styles.field}>
              <legend className={styles.legend}>Play</legend>
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

            <fieldset className={styles.field}>
              <legend className={styles.legend}>
                {isPractice ? 'Player' : 'Players'}
              </legend>
              <div className={clsx(styles.row, isPractice && styles.rowSingle)}>
                <PlayerField
                  value={player1}
                  placeholder={isPractice ? 'You' : 'Player 1'}
                  onNameChange={setPlayer1}
                />
                {showMatchplayFields ? (
                  <PlayerField
                    value={player2}
                    placeholder="Player 2"
                    onNameChange={setPlayer2}
                  />
                ) : null}
              </div>
            </fieldset>

            {showMatchplayFields ? (
              <fieldset className={clsx(styles.field, styles.formatField)}>
                <legend className={styles.legendSplit}>
                  <span>Match format</span>
                  <span className={styles.legendToggle}>
                    <button
                      type="button"
                      className={clsx(
                        styles.legendLink,
                        !playSets && styles.legendLinkActive,
                      )}
                      onClick={() => setPlaySets(false)}
                    >
                      Legs
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        styles.legendLink,
                        playSets && styles.legendLinkActive,
                      )}
                      onClick={() => setPlaySets(true)}
                    >
                      Sets
                    </button>
                  </span>
                </legend>
                {playSets ? (
                  <FormatRow
                    label="Sets"
                    ariaLabel="Sets"
                    target={setsTarget}
                    mode={setsMode}
                    onTargetChange={setSetsTarget}
                    onModeChange={setSetsMode}
                  />
                ) : null}
                <FormatRow
                  label={playSets ? 'Legs per set' : undefined}
                  ariaLabel="Legs"
                  target={legsTarget}
                  mode={mode}
                  onTargetChange={setLegsTarget}
                  onModeChange={setMode}
                />
              </fieldset>
            ) : null}
          </>
        )}
      </div>

      <button type="submit" className={styles.submit}>
        {submitLabel}
      </button>
    </form>
  )
}

export default MatchSetupForm
