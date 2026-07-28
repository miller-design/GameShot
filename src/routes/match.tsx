import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import MatchBoard from '#/components/MatchBoard'
import { useMatch } from '#/store/match'

export const Route = createFileRoute('/match')({
  component: MatchPage,
})

/**
 * Live match scoring page. Redirects home when no match is active.
 */
function MatchPage() {
  const { match, hydrated } = useMatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (!hydrated) return
    if (match === null) {
      void navigate({ to: '/' })
    }
  }, [match, hydrated, navigate])

  if (!hydrated || match === null) {
    return (
      <main
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          color: 'var(--color-text-muted)',
        }}
      >
        Loading…
      </main>
    )
  }

  return <MatchBoard match={match} />
}
