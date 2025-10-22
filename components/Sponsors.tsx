import Image from 'next/image'
import Link from 'next/link'
import styles from './Sponsors.module.css'

export default function Sponsors() {
  const sponsors = [
    {
      name: 'Ghost Athletics',
      image: '/img/sponsors/Sponsor2.png',
      link: '#'
    },
    {
      name: 'Grant Designs',
      image: '/img/sponsors/Sponsor3.png', 
      link: '#'
    },
    {
      name: 'CRL Podcast',
      image: '/img/sponsors/Sponsor4.png',
      link: 'https://open.spotify.com/show/55Kay8QF98WIDWnBc94tdu?si=AwYsCpzCQX2WK8yUCol61g&nd=1&dlsi=643597b2fc794e61'
    }
  ]

  return (
    <section id="sponsors" className="container">
      <h2>Our Partners</h2>
      <div className={styles.sponsors}>
        {sponsors.map((sponsor, index) => (
          <div key={index} className={styles.sponsorPlaceholder}>
            <Link 
              href={sponsor.link} 
              className={styles.sponsorLink}
              target={sponsor.link.startsWith('http') ? '_blank' : undefined}
              rel={sponsor.link.startsWith('http') ? 'noopener' : undefined}
            >
              <Image 
                src={sponsor.image} 
                alt={sponsor.name}
                width={200}
                height={150}
                style={{ objectFit: 'contain' }}
              />
            </Link>
            <div className={styles.sponsorCaption}>{sponsor.name}</div>
          </div>
        ))}
      </div>
    </section>
  )
}