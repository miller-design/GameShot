import { createFileRoute } from '@tanstack/react-router'

import MatchSetupForm from '#/components/MatchSetupForm'

import styles from './styles.module.css'

export const Route = createFileRoute('/')({
  component: Home,
})

/**
 * Home / match setup page.
 */
function Home() {
  return (
    <main className={styles.page}>
      <MatchSetupForm />
    </main>
  )
}
