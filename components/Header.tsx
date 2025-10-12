'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import styles from './Header.module.css'

interface LeagueDropdownProps {
  currentLeague: 'trucks' | 'elite' | 'arca'
}

function LeagueDropdown({ currentLeague }: LeagueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const leagues = [
    { id: 'trucks', name: 'CRL Trucks', image: '/img/crltruck.png', path: '/trucks' },
    { id: 'elite', name: 'CRL Elite', image: '/img/crlelite.png', path: '/elite' },
    { id: 'arca', name: 'CRL ARCA', image: '/img/crlarca.png', path: '/arca' }
  ]

  const currentLeagueData = leagues.find(league => league.id === currentLeague)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`${styles.leagueDropdown} ${isOpen ? styles.open : ''}`} ref={dropdownRef}>
      <button
        className={styles.leagueDropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-label="Select league"
      >
        {currentLeagueData && (
          <>
            <Image 
              src={currentLeagueData.image} 
              alt={currentLeagueData.name}
              width={44}
              height={44}
            />
            <strong>{currentLeagueData.name}</strong>
          </>
        )}
        <span className={styles.dropdownArrow}>▼</span>
      </button>
      
      <div className={styles.dropdownMenu}>
        {leagues.map((league) => (
          <div key={league.id}>
            {league.id === currentLeague ? (
              <div className={`${styles.dropdownItem} ${styles.active}`}>
                <Image 
                  src={league.image} 
                  alt={league.name}
                  width={28}
                  height={28}
                />
                <strong>{league.name}</strong>
              </div>
            ) : (
              <Link href={league.path} className={styles.dropdownItem}>
                <Image 
                  src={league.image} 
                  alt={league.name}
                  width={28}
                  height={28}
                />
                <strong>{league.name}</strong>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface HeaderProps {
  currentLeague?: 'trucks' | 'elite' | 'arca'
}

export default function Header({ currentLeague }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)

  const toggleNav = () => setIsNavOpen(!isNavOpen)
  const closeNav = () => setIsNavOpen(false)

  return (
    <header className={styles.header}>
      <div className={styles.logoPlaceholder}>
        {currentLeague ? (
          <LeagueDropdown currentLeague={currentLeague} />
        ) : (
          <div className={styles.brand}>
            <Image src="/img/crllogo.png" alt="Clean Racing League" width={44} height={44} />
            <strong>Clean Racing League</strong>
          </div>
        )}
        
        <button
          className={`${styles.navToggle} ${isNavOpen ? styles.open : ''}`}
          onClick={toggleNav}
          aria-expanded={isNavOpen}
          aria-controls="main-nav"
          aria-label="Toggle navigation"
        >
          <span className={styles.hamburger}></span>
        </button>

        <button
          className={styles.darkToggle}
          onClick={toggleTheme}
          aria-pressed={theme === 'light'}
          aria-label="Toggle dark mode"
        >
          <span className={styles.darkIcon}>
            {theme === 'light' ? '☀️' : '🌙'}
          </span>
        </button>

        <nav 
          id="main-nav" 
          className={`${styles.nav} ${isNavOpen ? styles.open : ''}`}
          role="navigation"
        >
          <Link href="/" className={styles.navLink} onClick={closeNav}>
            Home
          </Link>
          <Link href="/lifetime-stats" className={styles.navLink} onClick={closeNav}>
            Stats
          </Link>
          <button 
            className={`${styles.navLink} ${styles.donationButton}`}
            disabled
            title="Coming Soon"
            aria-label="Donation button - Coming Soon"
          >
            Donate
          </button>
          <Link 
            href="https://www.youtube.com/@OSRNetwork2016/streams" 
            className={`${styles.navLink} ${styles.socialLink}`}
            target="_blank" 
            rel="noopener"
            title="YouTube Broadcast"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className={styles.socialIcon}
            >
              <path d="M23.498 6.186a2.872 2.872 0 0 0-2.024-2.024C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.474.616A2.872 2.872 0 0 0 .502 6.186C-.114 8.155-.114 12-.114 12s0 3.845.616 5.814a2.872 2.872 0 0 0 2.024 2.024C4.495 20.454 12 20.454 12 20.454s7.505 0 9.474-.616a2.872 2.872 0 0 0 2.024-2.024C23.614 15.845 23.614 12 23.614 12s0-3.845-.616-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className={styles.socialText}>YouTube</span>
          </Link>
          <Link 
            href="https://discord.gg/yrvgHQpF8k" 
            className={`${styles.navLink} ${styles.socialLink}`}
            target="_blank" 
            rel="noopener"
            title="Join our Discord"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className={styles.socialIcon}
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.191.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/>
            </svg>
            <span className={styles.socialText}>Discord</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}