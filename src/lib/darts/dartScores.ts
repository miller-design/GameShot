/**
 * Legal visit totals achievable with 1–3 darts on a standard board
 * (singles 1–20, doubles, trebles, outer bull 25, bull 50).
 */

/**
 * Builds every score achievable with up to three darts.
 *
 * @returns Sorted unique visit totals including 0 (miss)
 *
 * @example
 * buildLegalVisitScores() // includes 0, 60, 180; excludes 179
 */
function buildLegalVisitScores(): number[] {
  const oneDart = new Set<number>([0, 25, 50])
  for (let n = 1; n <= 20; n++) {
    oneDart.add(n)
    oneDart.add(n * 2)
    oneDart.add(n * 3)
  }

  const scores = new Set<number>(oneDart)

  const oneList = [...oneDart]
  for (const a of oneList) {
    for (const b of oneList) {
      const two = a + b
      if (two <= 180) scores.add(two)
      for (const c of oneList) {
        const three = two + c
        if (three <= 180) scores.add(three)
      }
    }
  }

  return [...scores].sort((x, y) => x - y)
}

/** Sorted legal visit totals (0–180) achievable with ≤3 darts. */
export const LEGAL_VISIT_SCORES: readonly number[] = buildLegalVisitScores()

const LEGAL_VISIT_SET = new Set(LEGAL_VISIT_SCORES)

/**
 * Whether a visit total can be scored with up to three darts.
 *
 * @param scored - Proposed visit total
 * @returns True if the total is a legal dart combination
 *
 * @example
 * isLegalVisitScore(180) // true
 * isLegalVisitScore(179) // false
 */
export function isLegalVisitScore(scored: number): boolean {
  return LEGAL_VISIT_SET.has(scored)
}

/** Preferred leaves after a scoring visit (classic double-out setups). */
export const PREFERRED_LEAVES: readonly number[] = [
  40, 32, 36, 24, 16, 20, 8, 12, 4, 2, 50, 60, 41, 45, 61, 81, 85, 100, 120,
]

/**
 * Picks the legal visit closest to `target` that does not exceed `maxScore`.
 *
 * @param target - Desired visit total
 * @param maxScore - Inclusive upper bound (usually remaining - 2, or remaining for checkout)
 * @returns Nearest legal score within bounds, or 0 if none
 *
 * @example
 * nearestLegalVisit(87, 200) // 85 or 100 depending on distance
 */
export function nearestLegalVisit(target: number, maxScore: number): number {
  if (maxScore < 0) return 0
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (const score of LEGAL_VISIT_SCORES) {
    if (score > maxScore) break
    const dist = Math.abs(score - target)
    if (dist < bestDist) {
      best = score
      bestDist = dist
    }
  }
  return best
}

/**
 * Finds a legal visit that leaves a preferred setup when possible.
 *
 * @param remaining - Score before the visit
 * @param preferAvoidBogey - When true, skip leaves that are impossible checkouts
 * @param bogeys - Set of bogey remainings to avoid
 * @param rng - Random in [0, 1)
 * @returns Visit total to subtract, or null if no safe leave found
 *
 * @example
 * chooseSetupVisit(121, true, bogeys, Math.random)
 */
export function chooseSetupVisit(
  remaining: number,
  preferAvoidBogey: boolean,
  bogeys: ReadonlySet<number>,
  rng: () => number,
): number | null {
  const candidates: number[] = []
  for (const leave of PREFERRED_LEAVES) {
    if (leave >= remaining) continue
    const scored = remaining - leave
    if (!isLegalVisitScore(scored)) continue
    if (preferAvoidBogey && bogeys.has(leave)) continue
    candidates.push(scored)
  }
  if (candidates.length === 0) return null
  const index = Math.min(
    candidates.length - 1,
    Math.floor(rng() * candidates.length),
  )
  return candidates[index] ?? null
}
