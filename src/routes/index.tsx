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
      <header className={styles.setupHeader}>
        <p className={styles.eyebrow}>New match</p>
        <p className={styles.lede}>Set up matchplay or solo practice.</p>
      </header>
      <div className={styles.setupStage}>
        <MatchSetupForm />
      </div>
    </main>
  )
}
