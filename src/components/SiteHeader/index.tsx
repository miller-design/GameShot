import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

import styles from './styles.module.css'

type SiteHeaderProps = {
  className?: string
}

/**
 * Site header with a subtle GameShot logotype (mono).
 *
 * @param props.className - Optional class on the header
 *
 * @example
 * <SiteHeader />
 */
const SiteHeader = ({ className }: SiteHeaderProps) => {
  return (
    <header className={clsx(styles.root, className)}>
      <Link to="/" className={styles.logo} aria-label="GameShot home">
        GameShot
      </Link>
    </header>
  )
}

export default SiteHeader
