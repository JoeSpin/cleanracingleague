'use client'

import styles from './PlayoffBanners.module.css'

interface PlayoffBannersProps {
  league: 'trucks' | 'elite' | 'arca'
}

const BANNER_CONFIG = {
  trucks: {
    title: 'Truck Playoff Banners',
    banners: [
      { manufacturer: 'Chevrolet', filename: 'CRL TRUCK chevy banner.tga' },
      { manufacturer: 'Ford', filename: 'CRL TRUCK ford banner.tga' },
      { manufacturer: 'Toyota', filename: 'CRL TRUCK toyota banner.tga' }
    ]
  },
  elite: {
    title: 'Elite Playoff Banners',
    banners: [
      { manufacturer: 'Chevrolet', filename: 'Chevy CRL ELITE banner.tga' },
      { manufacturer: 'Ford', filename: 'Ford CRL ELITE banner.tga' },
      { manufacturer: 'Toyota', filename: 'Toyota CRL ELITE banner.tga' }
    ]
  },
  arca: {
    title: 'ARCA Playoff Banners',
    banners: [
      { manufacturer: 'Chevrolet', filename: 'ARCA Chevy.tga' },
      { manufacturer: 'Ford', filename: 'ARCA Ford.tga' },
      { manufacturer: 'Toyota', filename: 'ARCA Toyota.tga' }
    ]
  }
}

export default function PlayoffBanners({ league }: PlayoffBannersProps) {
  const config = BANNER_CONFIG[league]
  
  const handleDownload = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/banners/${league}banners/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <section id="playoff-banners" className="container">
      <h2>Playoff Banners</h2>
      <div className={styles.bannersContainer}>
        <p className={styles.description}>
          Download playoff banners for your favorite manufacturer:
        </p>
        <div className={styles.bannerGrid}>
          {config.banners.map((banner) => (
            <div key={banner.manufacturer} className={styles.bannerItem}>
              <h3>{banner.manufacturer}</h3>
              <button 
                className={styles.downloadButton}
                onClick={() => handleDownload(banner.filename)}
                title={`Download ${banner.manufacturer} playoff banner`}
              >
                <svg 
                  className={styles.downloadIcon} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="20" 
                  height="20"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download {banner.manufacturer} Banner
              </button>
              <span className={styles.fileInfo}>TGA Format</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}