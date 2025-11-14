'use client'

import React, { useState, useEffect } from 'react'
import styles from './StandingsTable.module.css'
import { calculatePlayoffStandings, getPlayoffRoundInfo, type PlayoffDriver } from '../lib/playoff-logic'
import { PLAYOFF_CONFIG, getPlayoffTitle, getRaceNumberFromPlayoffRound } from '../lib/playoff-config'

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
  drivers?: Driver[] // Old format
  teams?: Team[]
  standings?: any[] // New CSV format
  totalRaces?: number // Total races in season
  completedRaces?: number // Races completed so far
  currentRace?: number // Current race number
  isPlayoffSeason?: boolean // Whether playoffs have started
  currentPlayoffRound?: string // Current playoff round
  lastUpdated: string
  error?: string // Error message if any
}

export default function StandingsTable({ league }: StandingsTableProps) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [playoffDrivers, setPlayoffDrivers] = useState<PlayoffDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentRace, setCurrentRace] = useState<number>(PLAYOFF_CONFIG.currentRace)
  const [currentPlayoffRound, setCurrentPlayoffRound] = useState<string>('regular')
  const [totalRaces, setTotalRaces] = useState<number>(0)
  const [completedRaces, setCompletedRaces] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'drivers' | 'teams' | 'playoffs'>('drivers')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Function to download table as screenshot
  const downloadScreenshot = async (tableId: string, filename: string) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const table = document.getElementById(tableId);
      if (!table) return;
      
      // Find the container that includes both title and table
      const titleContainer = table.previousElementSibling as HTMLElement;
      if (!titleContainer) return;
      
      // Hide all download buttons during screenshot
      const downloadButtons = document.querySelectorAll(`.${styles.downloadButton}`);
      downloadButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      
      // Create a temporary wrapper with title and table
      const wrapper = document.createElement('div');
      wrapper.style.background = '#1a1a1a';
      wrapper.style.padding = '20px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.fontFamily = '"League Spartan", sans-serif';
      
      // Clone title (without download button) and table
      const titleClone = titleContainer.cloneNode(true) as HTMLElement;
      const downloadBtn = titleClone.querySelector(`.${styles.downloadButton}`);
      if (downloadBtn) {
        downloadBtn.remove();
      }
      
      const tableClone = table.cloneNode(true) as HTMLElement;
      
      wrapper.appendChild(titleClone);
      wrapper.appendChild(tableClone);
      document.body.appendChild(wrapper);
      
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
      } as any);
      
      // Clean up
      document.body.removeChild(wrapper);
      
      // Restore download buttons
      downloadButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'flex';
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating screenshot:', error);
      alert('Error generating screenshot. Please try again.');
      
      // Restore download buttons in case of error
      const downloadButtons = document.querySelectorAll(`.${styles.downloadButton}`);
      downloadButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'flex';
      });
    }
  };

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/standings-csv?series=${league === 'trucks' ? 'Truck' : 'ARCA'}&season=${league === 'trucks' ? 'CRL Truck Series Season 24' : 'CRL ARCA SEASON 2'}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch standings')
        }
        
        const data: StandingsResponse = await response.json()
        
        // Check if API returned an error message
        if (data.error) {
          setError(data.error);
        }
        
        // Map CSV standings format to component format
        const mappedDrivers = (data.standings || []).map((standing: any, index: number) => ({
          position: index + 1, // Position based on sort order
          change: standing.positionChange || '',
          name: standing.driver,
          points: standing.totalPoints,
          behindLeader: index === 0 ? '-' : `-${(data.standings?.[0]?.totalPoints || 0) - standing.totalPoints}`,
          starts: standing.races || 0, // Number of races started
          wins: standing.wins,
          top5: standing.top5s,
          top10: standing.top10s,
          laps: standing.totalLapsLed,
          incidents: standing.totalIncidents
        }));
        
        setDrivers(mappedDrivers)
        setTeams([]) // Teams not implemented in CSV format yet
        setLastUpdated(data.lastUpdated)
        setTotalRaces(data.totalRaces || 0)
        setCompletedRaces(data.completedRaces || 0)
        
        // Use current race from API, playoff round, or fall back to completed races
        let raceNumber = data.currentRace || data.completedRaces || PLAYOFF_CONFIG.currentRace
        
        // If we have playoff round data but no specific race number, derive it from the round
        if (data.currentPlayoffRound && !data.currentRace) {
          raceNumber = getRaceNumberFromPlayoffRound(data.currentPlayoffRound)
        }
        
        setCurrentRace(raceNumber)
        setCurrentPlayoffRound(data.currentPlayoffRound || 'regular')
        
        // Handle playoff standings for trucks league
        if (league === 'trucks' && mappedDrivers.length > 0) {
          let playoff: PlayoffDriver[];
          
          // If we have uploaded playoff standings, use them directly
          if (data.isPlayoffSeason && data.currentPlayoffRound !== 'regular') {
            // Convert uploaded playoff data to PlayoffDriver format
            playoff = mappedDrivers.map((driver, index) => ({
              ...driver,
              playoffStatus: 'IN' as const, // Will be determined by cutoff logic
              playoffPoints: '+0', // Will be calculated based on position
              isAboveCutoff: true // Will be determined by cutoff logic
            }));
            
            // Determine cutoff based on current playoff round
            const roundConfig = PLAYOFF_CONFIG.rounds[data.currentPlayoffRound as keyof typeof PLAYOFF_CONFIG.rounds];
            const cutoffPosition = roundConfig.cutoff;
            
            // Get the points of the driver at the cutoff line (last driver to advance)
            const cutoffDriverPoints = playoff[cutoffPosition - 1]?.points || 0;
            
            // Update playoff status and points based on points differential from cutoff
            playoff.forEach((driver, index) => {
              const pointsDiff = driver.points - cutoffDriverPoints;
              
              if (index < cutoffPosition) {
                driver.isAboveCutoff = true;
                driver.playoffStatus = 'IN';
                if (index === 0) {
                  driver.playoffPoints = 'LEADER';
                } else if (pointsDiff > 0) {
                  driver.playoffPoints = `+${pointsDiff}`;
                } else {
                  driver.playoffPoints = '0';
                }
              } else {
                driver.isAboveCutoff = false;
                driver.playoffStatus = 'OUT';
                driver.playoffPoints = pointsDiff < 0 ? `${pointsDiff}` : '0';
              }
            });
            
            // Limit to appropriate number based on playoff round
            const roundDisplayCount = roundConfig.displayCount;
            playoff = playoff.slice(0, roundDisplayCount);
          } else {
            // Calculate playoff standings from regular season data
            const roundWinners: string[] = [] // Should be populated from playoff standings metadata
            playoff = calculatePlayoffStandings(mappedDrivers, raceNumber, roundWinners);
          }
          
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



      <div className={styles.tableContainer}>
        {activeTab === 'drivers' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--crl-gold)' }}>Current Standings</h3>
              <button 
                onClick={() => downloadScreenshot('driver_table', 'current-standings')}
                className={styles.downloadButton}
                title="Download standings as image"
              >
                📸 Download
              </button>
            </div>
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
          </>
        ) : activeTab === 'playoffs' && league === 'trucks' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--crl-gold)' }}>{getPlayoffTitle(currentRace)}</h3>
              <button 
                onClick={() => downloadScreenshot('playoff_table', 'playoff-standings')}
                className={styles.downloadButton}
                title="Download playoff standings as image"
              >
                📸 Download
              </button>
            </div>
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
                // Use current playoff round data for cutoff calculation
                const roundInfo = currentPlayoffRound !== 'regular' 
                  ? PLAYOFF_CONFIG.rounds[currentPlayoffRound as keyof typeof PLAYOFF_CONFIG.rounds]
                  : getPlayoffRoundInfo(currentRace);
                const isCutoffLine = index === roundInfo.cutoff - 1;
                
                // Debug logging
                if (index === 0) {
                  console.log('Playoff Debug:', { currentPlayoffRound, currentRace, roundInfo, totalDrivers: playoffDrivers.length });
                }
                
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
          </>
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