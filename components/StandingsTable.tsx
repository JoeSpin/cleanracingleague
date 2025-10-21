'use client'

import React, { useState, useEffect } from 'react'
import styles from './StandingsTable.module.css'
import { calculatePlayoffStandings, getPlayoffRoundInfo, type PlayoffDriver } from '../lib/playoff-logic'
import { PLAYOFF_CONFIG, getPlayoffTitle } from '../lib/playoff-config'

interface StandingsTableProps {
  league: 'trucks' | 'arca'
}

const LEAGUE_CONFIG = {
  trucks: { includeTeams: true },
  arca: { includeTeams: true },
}

interface Driver {
  position: number
  change: string
  name: string
  points: number
  behindLeader: string
  starts: number
  wins: number
  top5: number
  top10: number
  laps: number
  incidents: number
  profileUrl?: string
}

interface Team {
  position: number
  change: string
  name: string
  points: number
  behindLeader: string
  starts: number
  wins: number
  top5: number
  top10: number
  laps: number
  incidents: number
  profileUrl?: string
}

interface StandingsResponse {
  drivers: Driver[]
  teams?: Team[]
  lastUpdated: string
  currentRace?: number
}

export default function StandingsTable({ league }: StandingsTableProps) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [playoffDrivers, setPlayoffDrivers] = useState<PlayoffDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentRace, setCurrentRace] = useState<number>(PLAYOFF_CONFIG.currentRace)
  const [activeTab, setActiveTab] = useState<'drivers' | 'teams' | 'playoffs'>('drivers')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/standings?league=${league}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch standings')
        }
        
        const data: StandingsResponse = await response.json()
        
        setDrivers(data.drivers || [])
        setTeams(data.teams || [])
        setLastUpdated(data.lastUpdated)
        
        // Use race number from API if available, otherwise fall back to config
        const raceNumber = data.currentRace || PLAYOFF_CONFIG.currentRace
        setCurrentRace(raceNumber)
        
        // Calculate playoff standings only for trucks league
        if (league === 'trucks' && data.drivers && data.drivers.length > 0) {
          const playoff = calculatePlayoffStandings(data.drivers, raceNumber)
          setPlayoffDrivers(playoff)
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Error fetching standings:', err)
        setError('Failed to load standings')
        setLoading(false)
        
        // Fallback to mock data on error
        setDrivers([
          { position: 1, change: '-', name: 'Loading...', points: 0, behindLeader: '-', starts: 0, wins: 0, top5: 0, top10: 0, laps: 0, incidents: 0 },
        ])
      }
    }

    fetchStandings()
  }, [league])

  const handleSort = (column: keyof Driver | keyof Team) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig && sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key: column, direction })
    
    // Only sort the active tab's data
    if (activeTab === 'drivers') {
      setDrivers(prevDrivers => {
        const sortedDrivers = [...prevDrivers].sort((a, b) => {
          const aValue = a[column as keyof Driver]
          const bValue = b[column as keyof Driver]
          
          // Handle numeric sorting
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue
          }
          
          // Handle string sorting
          const aString = String(aValue).toLowerCase()
          const bString = String(bValue).toLowerCase()
          
          if (direction === 'asc') {
            return aString < bString ? -1 : aString > bString ? 1 : 0
          } else {
            return aString > bString ? -1 : aString < bString ? 1 : 0
          }
        })
        
        return sortedDrivers
      })
    } else {
      setTeams(prevTeams => {
        const sortedTeams = [...prevTeams].sort((a, b) => {
          const aValue = a[column as keyof Team]
          const bValue = b[column as keyof Team]
          
          // Handle numeric sorting
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue
          }
          
          // Handle string sorting
          const aString = String(aValue).toLowerCase()
          const bString = String(bValue).toLowerCase()
          
          if (direction === 'asc') {
            return aString < bString ? -1 : aString > bString ? 1 : 0
          } else {
            return aString > bString ? -1 : aString < bString ? 1 : 0
          }
        })
        
        return sortedTeams
      })
    }
  }

  const getSortIndicator = (column: string) => {
    if (!sortConfig || sortConfig.key !== column) {
      return ' ↕'
    }
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
  }

  if (loading) {
    return (
      <section id="standings" className="container">
        <h2>Standings</h2>
        <div className={styles.loading}>Loading standings...</div>
      </section>
    )
  }

  return (
    <section id="standings" className="container">
      <h2>Standings</h2>
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <p>Displaying cached data if available</p>
        </div>
      )}
      
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'drivers' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('drivers')
            setSortConfig(null)
          }}
        >
          Driver Standings
        </button>
        {league === 'trucks' && (
          <button
            className={`${styles.tab} ${activeTab === 'playoffs' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('playoffs')
              setSortConfig(null)
            }}
          >
            Playoff Standings
          </button>
        )}
        {LEAGUE_CONFIG[league].includeTeams && (
          <button
            className={`${styles.tab} ${activeTab === 'teams' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('teams')
              setSortConfig(null)
            }}
          >
            Team Standings
          </button>
        )}
      </div>

      {lastUpdated && (
        <div className={styles.lastUpdated}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      {activeTab === 'playoffs' && league === 'trucks' && (
        <div className={styles.playoffHeader}>
          <h3>{getPlayoffTitle(currentRace)}</h3>
        </div>
      )}

      <div className={styles.tableContainer}>
        {activeTab === 'drivers' ? (
          <table className={styles.standingsTable} id="driver_table">
            <thead>
              <tr>
                <th onClick={() => handleSort('position')}>Pos{getSortIndicator('position')}</th>
                <th onClick={() => handleSort('change')}>Chg{getSortIndicator('change')}</th>
                <th onClick={() => handleSort('name')}>Driver{getSortIndicator('name')}</th>
                <th onClick={() => handleSort('points')}>Points{getSortIndicator('points')}</th>
                <th onClick={() => handleSort('behindLeader')}>Behind Leader{getSortIndicator('behindLeader')}</th>
                <th onClick={() => handleSort('starts')}>Starts{getSortIndicator('starts')}</th>
                <th onClick={() => handleSort('wins')}>Wins{getSortIndicator('wins')}</th>
                <th onClick={() => handleSort('top5')}>Top 5{getSortIndicator('top5')}</th>
                <th onClick={() => handleSort('top10')}>Top 10{getSortIndicator('top10')}</th>
                <th onClick={() => handleSort('laps')}>Laps{getSortIndicator('laps')}</th>
                <th onClick={() => handleSort('incidents')}>Inc{getSortIndicator('incidents')}</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.name}>
                  <td>{driver.position}</td>
                  <td>{driver.change}</td>
                  <td>
                    {driver.profileUrl ? (
                      <a 
                        href={driver.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--crl-gold)', textDecoration: 'none' }}
                      >
                        {driver.name}
                      </a>
                    ) : (
                      driver.name
                    )}
                  </td>
                  <td>{driver.points}</td>
                  <td>{driver.behindLeader}</td>
                  <td>{driver.starts}</td>
                  <td>{driver.wins}</td>
                  <td>{driver.top5}</td>
                  <td>{driver.top10}</td>
                  <td>{driver.laps}</td>
                  <td>{driver.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'playoffs' && league === 'trucks' ? (
          <table className={styles.standingsTable} id="playoff_table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Driver</th>
                <th>Points</th>
                <th>+/-</th>
                <th>Wins</th>
                <th>Top 5</th>
                <th>Top 10</th>
              </tr>
            </thead>
            <tbody>
              {playoffDrivers.map((driver, index) => {
                const roundInfo = getPlayoffRoundInfo(currentRace);
                const isCutoffLine = index === roundInfo.cutoff - 1;
                
                return (
                  <React.Fragment key={driver.name}>
                    <tr 
                      className={`
                        ${driver.isAboveCutoff ? styles.playoffIn : styles.playoffOut} 
                        ${driver.playoffStatus === 'ADV' ? styles.playoffAdvanced : ''}
                      `}
                    >
                      <td>{driver.position}</td>
                      <td>
                        {driver.profileUrl ? (
                          <a 
                            href={driver.profileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--crl-gold)', textDecoration: 'none' }}
                          >
                            {driver.name}
                          </a>
                        ) : (
                          driver.name
                        )}
                      </td>
                      <td>{driver.points}</td>
                      <td className={styles.playoffPoints}>
                        {driver.playoffPoints}
                      </td>
                      <td>{driver.wins}</td>
                      <td>{driver.top5}</td>
                      <td>{driver.top10}</td>
                    </tr>
                    {isCutoffLine && (
                      <tr className={styles.playoffCutoff}>
                        <td colSpan={7}>
                          <div className={styles.cutoffLine}>
                            Playoff Cutoff
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        ) : LEAGUE_CONFIG[league].includeTeams ? (
          <table className={styles.standingsTable} id="team_table">
            <thead>
              <tr>
                <th onClick={() => handleSort('position')}>Pos{getSortIndicator('position')}</th>
                <th onClick={() => handleSort('change')}>Chg{getSortIndicator('change')}</th>
                <th onClick={() => handleSort('name')}>Team{getSortIndicator('name')}</th>
                <th onClick={() => handleSort('points')}>Points{getSortIndicator('points')}</th>
                <th onClick={() => handleSort('behindLeader')}>Behind Leader{getSortIndicator('behindLeader')}</th>
                <th onClick={() => handleSort('starts')}>Starts{getSortIndicator('starts')}</th>
                <th onClick={() => handleSort('wins')}>Wins{getSortIndicator('wins')}</th>
                <th onClick={() => handleSort('top5')}>Top 5{getSortIndicator('top5')}</th>
                <th onClick={() => handleSort('top10')}>Top 10{getSortIndicator('top10')}</th>
                <th onClick={() => handleSort('laps')}>Laps{getSortIndicator('laps')}</th>
                <th onClick={() => handleSort('incidents')}>Inc{getSortIndicator('incidents')}</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.name}>
                  <td>{team.position}</td>
                  <td>{team.change}</td>
                  <td>
                    {team.profileUrl ? (
                      <a 
                        href={team.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--crl-gold)', textDecoration: 'none' }}
                      >
                        {team.name}
                      </a>
                    ) : (
                      team.name
                    )}
                  </td>
                  <td>{team.points}</td>
                  <td>{team.behindLeader}</td>
                  <td>{team.starts}</td>
                  <td>{team.wins}</td>
                  <td>{team.top5}</td>
                  <td>{team.top10}</td>
                  <td>{team.laps}</td>
                  <td>{team.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  )
}