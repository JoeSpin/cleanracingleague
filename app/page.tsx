import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.background}></div>
      <div className={styles.overlay}></div>
      
      <main className={styles.content}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.logoWrapper}>
            <Image 
              src="/img/crllogo.png" 
              alt="Clean Racing League" 
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <h1 className={styles.title}>Clean Racing League</h1>
        </div>

        {/* Series Cards */}
        <div className={styles.seriesGrid}>
          <Link href="/trucks" className={styles.seriesCard}>
            <div className={styles.cardContent}>
              <div className={styles.seriesLogo}>
                <Image 
                  src="/img/crltruck.png" 
                  alt="CRL Trucks" 
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className={styles.cardInfo}>
                <h2>Truck Series</h2>
                <span className={styles.viewButton}>Series Home →</span>
              </div>
            </div>
            <div className={styles.cardGlow}></div>
          </Link>

          <Link href="/arca" className={styles.seriesCard}>
            <div className={styles.cardContent}>
              <div className={styles.seriesLogo}>
                <Image 
                  src="/img/crlarca.png" 
                  alt="CRL ARCA" 
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className={styles.cardInfo}>
                <h2>ARCA Series</h2>
                <span className={styles.viewButton}>Series Home →</span>
              </div>
            </div>
            <div className={styles.cardGlow}></div>
          </Link>
        </div>
      </main>
    </div>
  )
}