import type { Metadata } from 'next'
import Header from '@/components/Header'
import LifetimeStatsTable from '@/components/LifetimeStatsTable'
import styles from './lifetime-stats.module.css'

export const metadata: Metadata = {
  title: 'Clean Racing League - Lifetime Stats',
  description: 'Lifetime statistics for all CRL series drivers',
}

export default function LifetimeStatsPage() {
  return (
    <main className={styles.container}>
      <Header />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Lifetime Statistics</h1>
          <p>Complete driver statistics across all CRL series</p>
        </div>
        
        <LifetimeStatsTable />
      </div>
    </main>
  )
}