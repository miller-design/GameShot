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
        <div className={styles.eyebrow}>New match</div>
        <h1 className={styles.title}>GameShot</h1>
        <p className={styles.lede}>
          Set up matchplay or solo practice.
        </p>
      </header>
      <MatchSetupForm />
    </main>
  )
}
