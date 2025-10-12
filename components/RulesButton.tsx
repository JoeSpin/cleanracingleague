'use client'

import styles from './RulesButton.module.css'

interface RulesButtonProps {
  href: string
}

export default function RulesButton({ href }: RulesButtonProps) {
  return (
    <div className={styles.rulesButtonContainer}>
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.rulesButton}
      >
        View Rules
      </a>
    </div>
  )
}