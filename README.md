# GameShot — Darts Counter

Local-first matchplay scorer for **501**, **701**, and **1001**. Named for the winning double. Built with [TanStack Start](https://tanstack.com/start).

## Getting started

```bash
pnpm install
pnpm dev
```

Dev server runs on [http://localhost:5010](http://localhost:5010).

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Dev server (port 5010) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run Vitest |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier + ESLint fix |
| `pnpm generate-routes` | Regenerate TanStack Router route tree |

## Features

- Play modes: matchplay (two humans), endless practice, vs computer (Easy / Medium / Hard)
- Match setup: player names, starting score, first-to / best-of legs, computer level
- Target-style board: scored / to-go history, dart spine, large remaining scores
- Clear turn indicators (header marker + neon active panel + input cell)
- Touch score pad + desktop keyboard (digits, Enter, Backspace, Escape)
- Bust handling, undo, leg/match win overlays, light in-match stats
- Match state persisted in `sessionStorage` for refresh safety

## Structure

```
src/
  components/   # Match UI (setup, board, pad, stats, result)
  lib/darts/    # Pure scoring engine, legal visit table, bot + tests
  routes/       # / (setup), /match (board)
  store/        # MatchProvider + session persistence
  styles/       # Tokens, forms, breakpoints
  types/        # Match types
```

## Styling

- Dark charcoal base + neon lime accent (`--color-accent`)
- Custom media breakpoints only (`--bp-sm`, `--bp-md`, …)
- Nested CSS in component modules
