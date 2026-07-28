import clsx from 'clsx'

import type { <FTName>Props } from './types'
import styles from './styles.module.css'

const <FTName> = ({ className }: <FTName>Props) => {
  return <div className={clsx(styles.root, className)}>{/* TODO */}</div>
}

export default <FTName>