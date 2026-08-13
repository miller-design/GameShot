import clsx from 'clsx'
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { flushSync } from 'react-dom'
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
  const [legsTarget, setLegsTarget] = useState<number | ''>(3)
  const [setsMode, setSetsMode] = useState<MatchMode>('first-to')
  const [setsTarget, setSetsTarget] = useState<number | ''>(1)
  const [firstThrower, setFirstThrower] = useState<PlayerIndex>(0)
  const [panelHeight, setPanelHeight] = useState<number | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const gameFieldRef = useRef<HTMLFieldSetElement>(null)
  const optionsStackRef = useRef<HTMLDivElement>(null)

  /**
   * Reads a stacked options variant's content height. WebKit can report 0
   * for `visibility: hidden` nodes after a toggle, so inactive variants are
   * briefly forced into layout for the read.
   *
   * @param variant - One `.optionsVariant` element in the stack
   *
   * @example
   * measureVariantHeight(optionsStack.children[0])
   */
  function measureVariantHeight(variant: HTMLElement) {
    const wasActive = variant.classList.contains(styles.optionsActive)
    if (wasActive) return variant.offsetHeight

    const previousVisibility = variant.style.visibility
    const previousOpacity = variant.style.opacity
    // Keep it non-visible to the user, but participating in layout.
    variant.style.visibility = 'visible'
    variant.style.opacity = '0'
    const height = variant.offsetHeight
    variant.style.visibility = previousVisibility
    variant.style.opacity = previousOpacity
    return height
  }

  /**
   * Measures the tallest panel layout and writes `--setup-panel-height`
   * so the modal stays that size across game options. Re-runs on resize
   * and orientation change — not on game-type toggles (those remasures
   * were collapsing the lock on iOS Safari).
   *
   * @example
   * measurePanelHeight()
   */
  function measurePanelHeight() {
    const panel = panelRef.current
    const gameField = gameFieldRef.current
    const optionsStack = optionsStackRef.current
    if (!panel || !gameField || !optionsStack) return

    // Measure against intrinsic height so a prior lock cannot clip/stretch reads.
    const previousLock = panel.style.getPropertyValue('--setup-panel-height')
    panel.style.setProperty('--setup-panel-height', 'auto')

    const computed = getComputedStyle(panel)
    const paddingY =
      Number.parseFloat(computed.paddingTop) +
      Number.parseFloat(computed.paddingBottom)
    const gap = Number.parseFloat(computed.rowGap || computed.gap) || 0

    let tallestVariant = 0
    for (const variant of optionsStack.children) {
      if (variant instanceof HTMLElement) {
        tallestVariant = Math.max(tallestVariant, measureVariantHeight(variant))
      }
    }

    const nextHeight = Math.ceil(
      gameField.offsetHeight + gap + tallestVariant + paddingY,
    )

    if (previousLock) {
      panel.style.setProperty('--setup-panel-height', previousLock)
    } else {
      panel.style.removeProperty('--setup-panel-height')
    }

    setPanelHeight((current) => (current === nextHeight ? current : nextHeight))
  }

  useLayoutEffect(() => {
    const gameField = gameFieldRef.current
    const optionsStack = optionsStackRef.current
    if (!gameField || !optionsStack) return

    measurePanelHeight()

    // Only watch the game field for typography/control size changes.
    // Observing the stacked variants re-fired on visibility toggles and
    // let Safari rewrite the lock to the shorter (121) height.
    const observer = new ResizeObserver(measurePanelHeight)
    observer.observe(gameField)

    window.addEventListener('resize', measurePanelHeight)
    window.addEventListener('orientationchange', measurePanelHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measurePanelHeight)
      window.removeEventListener('orientationchange', measurePanelHeight)
    }
  }, [])

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
    const normalizeTarget = (target: number | '', targetMode: MatchMode) => {
      const value = Math.max(1, Math.min(21, Math.floor(Number(target) || 1)))
      return targetMode === 'best-of' && value % 2 === 0 ? value + 1 : value
    }
    const legs = normalizeTarget(legsTarget, mode)
    const sets = normalizeTarget(setsTarget, setsMode)
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
    } else if (playMode === 'practice') {
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
      const name2 = player2.trim() || 'Player 2'
      config = {
        gameType,
        playMode: 'matchplay',
        playerNames: [name1, name2],
        startingScore,
        mode,
        legsTarget: legs,
        setsMode,
        setsTarget: sets,
        firstThrower,
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

  const opponentLabel = player2.trim() || 'Player 2'

  const isPractice = playMode === 'practice'
  const isX01 = gameType === 'x01'
  const is121 = gameType === '121'

  const isReady = panelHeight != null

  const panelStyle = {
    ...(isReady ? { '--setup-panel-height': `${panelHeight}px` } : {}),
  } as CSSProperties

  return (
    <form
      className={clsx(styles.root, isReady && styles.ready, className)}
      onSubmit={handleSubmit}
      aria-busy={!isReady}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        style={panelStyle}
        inert={isReady ? undefined : true}
      >
        <fieldset ref={gameFieldRef} className={styles.field}>
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

        {/*
          Stack both game-type layouts in one grid cell so the panel
          always sizes to the tallest option (X01 matchplay).
        */}
        <div ref={optionsStackRef} className={styles.optionsStack}>
          <div
            className={clsx(
              styles.optionsVariant,
              isX01 && styles.optionsActive,
            )}
            inert={isX01 ? undefined : true}
            aria-hidden={!isX01}
          >
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

            <fieldset className={styles.field}>
              <legend className={styles.legend}>
                {isPractice ? 'Player' : 'Players'}
              </legend>
              <div className={styles.row}>
                <label className={clsx(styles.label, styles.playerLabel)}>
                  {isPractice ? 'You' : 'Player 1'}
                  <input
                    type="text"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    maxLength={24}
                    autoComplete="off"
                  />
                </label>
                <label
                  className={clsx(
                    styles.label,
                    styles.playerLabel,
                    isPractice && styles.reservedHidden,
                  )}
                  inert={isPractice || undefined}
                  aria-hidden={isPractice}
                >
                  Player 2
                  <input
                    type="text"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    maxLength={24}
                    autoComplete="off"
                    tabIndex={isPractice ? -1 : undefined}
                  />
                </label>
              </div>
            </fieldset>

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

            <fieldset
              className={clsx(
                styles.field,
                styles.formatField,
                isPractice && styles.reservedHidden,
              )}
              inert={isPractice || undefined}
              aria-hidden={isPractice}
            >
              <legend className={styles.legend}>Match format</legend>
              <label className={styles.formatLabel}>
                Sets
                <div className={styles.segment}>
                  <input
                    type="number"
                    className={styles.legsInput}
                    aria-label="Sets"
                    min={1}
                    max={21}
                    step={setsMode === 'best-of' ? 2 : 1}
                    value={setsTarget}
                    tabIndex={isPractice ? -1 : undefined}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        setSetsTarget('')
                        return
                      }
                      const parsed = Number(raw)
                      if (!Number.isNaN(parsed)) setSetsTarget(parsed)
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={isPractice ? -1 : undefined}
                    className={clsx(
                      styles.segmentBtn,
                      setsMode === 'first-to' && styles.segmentActive,
                    )}
                    onClick={() => setSetsMode('first-to')}
                  >
                    First to
                  </button>
                  <button
                    type="button"
                    tabIndex={isPractice ? -1 : undefined}
                    className={clsx(
                      styles.segmentBtn,
                      setsMode === 'best-of' && styles.segmentActive,
                    )}
                    onClick={() => {
                      setSetsMode('best-of')
                      setSetsTarget((current) =>
                        typeof current === 'number' && current % 2 === 0
                          ? Math.min(21, current + 1)
                          : current,
                      )
                    }}
                  >
                    Best of
                  </button>
                </div>
              </label>
              <label className={styles.formatLabel}>
                Legs per set
                <div className={styles.segment}>
                  <input
                    type="number"
                    className={styles.legsInput}
                    aria-label="Legs"
                    min={1}
                    max={21}
                    step={mode === 'best-of' ? 2 : 1}
                    value={legsTarget}
                    tabIndex={isPractice ? -1 : undefined}
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
                    tabIndex={isPractice ? -1 : undefined}
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
                    tabIndex={isPractice ? -1 : undefined}
                    className={clsx(
                      styles.segmentBtn,
                      mode === 'best-of' && styles.segmentActive,
                    )}
                    onClick={() => {
                      setMode('best-of')
                      setLegsTarget((current) =>
                        typeof current === 'number' && current % 2 === 0
                          ? Math.min(21, current + 1)
                          : current,
                      )
                    }}
                  >
                    Best of
                  </button>
                </div>
              </label>
            </fieldset>

            <fieldset
              className={clsx(
                styles.field,
                isPractice && styles.reservedHidden,
              )}
              inert={isPractice || undefined}
              aria-hidden={isPractice}
            >
              <legend className={styles.legend}>First throw</legend>
              <div className={styles.segment}>
                <button
                  type="button"
                  tabIndex={isPractice ? -1 : undefined}
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
                  tabIndex={isPractice ? -1 : undefined}
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
          </div>

          <div
            className={clsx(
              styles.optionsVariant,
              is121 && styles.optionsActive,
            )}
            inert={is121 ? undefined : true}
            aria-hidden={!is121}
          >
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
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={styles.submit}
        tabIndex={isReady ? undefined : -1}
      >
        {is121 ? 'Start 121' : isPractice ? 'Start practice' : 'Start match'}
      </button>
    </form>
  )
}

export default MatchSetupForm
