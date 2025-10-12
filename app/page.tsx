import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.background}></div>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <div className={styles.mainLogo}>
          <Image 
            src="/img/crllogo.png" 
            alt="CRL" 
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <div className={styles.cardRow}>
          <Link href="/arca" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crlarca.png" 
                alt="CRL ARCA" 
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </Link>
          <Link href="/trucks" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crltruck.png" 
                alt="CRL Trucks" 
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </Link>
          <Link href="/elite" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crlelite.png" 
                alt="CRL Elite" 
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}