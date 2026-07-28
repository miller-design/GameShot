import clsx from 'clsx'

import styles from './styles.module.css'

type SiteFooterProps = {
  className?: string
}

/**
 * Site footer with copyright.
 *
 * @param props.className - Optional class on the footer
 *
 * @example
 * <SiteFooter />
 */
const SiteFooter = ({ className }: SiteFooterProps) => {
  const year = new Date().getFullYear()

  return (
    <footer className={clsx(styles.root, className)}>
      <p className={styles.copy}>© {year} GameShot. All rights reserved.</p>
    </footer>
  )
}

export default SiteFooter
