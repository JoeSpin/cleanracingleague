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
            width={520}
            height={520}
            priority
          />
        </div>
        <div className={styles.cardRow}>
          <Link href="/arca" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crlarca.png" 
                alt="CRL ARCA" 
                width={280}
                height={280}
              />
            </div>
          </Link>
          <Link href="/trucks" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crltruck.png" 
                alt="CRL Trucks" 
                width={280}
                height={280}
              />
            </div>
          </Link>
          <Link href="/elite" className={styles.logoCard}>
            <div className={styles.logoPlaceholder}>
              <Image 
                src="/img/crlelite.png" 
                alt="CRL Elite" 
                width={280}
                height={280}
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}