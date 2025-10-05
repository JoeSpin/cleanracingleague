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
          <Link href="#sponsors" className={styles.navLink} onClick={closeNav}>
            Partners
          </Link>
          <Link href="#standings" className={styles.navLink} onClick={closeNav}>
            Standings
          </Link>
          <Link href="#schedule" className={styles.navLink} onClick={closeNav}>
            Schedule
          </Link>
          <Link href="#playoff-banners" className={styles.navLink} onClick={closeNav}>
            Banners
          </Link>
          <Link href="#rules" className={styles.navLink} onClick={closeNav}>
            Rules
          </Link>
          <Link 
            href="https://www.youtube.com/@OSRNetwork2016/streams" 
            className={styles.navLink} 
            target="_blank" 
            rel="noopener"
          >
            YouTube Broadcast
          </Link>
        </nav>
      </div>
    </header>
  )
}