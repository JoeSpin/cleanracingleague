'use client'

import { useState, useEffect } from 'react'
import styles from './RaceWinner.module.css'

interface RaceWinnerProps {
  league: 'trucks' | 'arca'
}

interface RaceResult {
  winner: string
  track: string
  date: string
  resultsUrl?: string
  profileUrl?: string
}

interface RaceResultsResponse {
  result?: RaceResult | null // Old format
  latestWinner?: any // New CSV format
  lastUpdated?: string
}

export default function RaceWinner({ league }: RaceWinnerProps) {
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    const fetchRaceResults = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/race-winners?series=${league === 'trucks' ? 'Truck' : 'ARCA'}&season=${league === 'trucks' ? 'CRL Truck Series Season 24' : 'CRL ARCA SEASON 2'}&latest=true`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch race results')
        }
        
        const data: RaceResultsResponse = await response.json()
        
        // Handle both old and new API formats
        if (data.latestWinner) {
          // New CSV format
          const resultsUrl = league === 'trucks' 
            ? 'https://www.simracerhub.com/season_race.php?series_id=10554'
            : 'https://www.simracerhub.com/season_race.php?series_id=12526';
            
          setRaceResult({
            winner: data.latestWinner.driver,
            track: data.latestWinner.track,
            date: data.latestWinner.date,
            profileUrl: data.latestWinner.profileUrl,
            resultsUrl: resultsUrl
          })
        } else if (data.result) {
          // Old format
          setRaceResult(data.result)
        } else {
          // No data available
          setRaceResult(null)
        }
        
        setLastUpdated(data.lastUpdated || new Date().toISOString())
        setLoading(false)
      } catch (err) {
        console.error('Error fetching race results:', err)
        setError('Failed to load race results')
        setLoading(false)
        
        // Fallback to show no data available
        setRaceResult({
          winner: 'Data Unavailable',
          track: 'Unable to load race information',
          date: new Date().toLocaleDateString()
        })
      }
    }

    fetchRaceResults()
  }, [league])

  if (loading) {
    return (
      <section className={styles.raceWinner}>
        <div className={styles.raceWinnerContent}>
          <h3>Latest Race Winner</h3>
          <div className={styles.loading}>Loading race results...</div>
        </div>
      </section>
    )
  }

  if (error || !raceResult) {
    return (
      <section className={styles.raceWinner}>
        <div className={styles.raceWinnerContent}>
          <h3>Latest Race Winner</h3>
          <div className={styles.error}>Unable to load race results</div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.raceWinner}>
      <div className={styles.raceWinnerContent}>
        <h3>Latest Race Winner</h3>
        {error && (
          <div className={styles.error}>
            <small>{error}</small>
          </div>
        )}
        <div className={styles.winnerInfo}>
          <div className={styles.winnerDetails}>
            <div className={styles.winnerName}>
              {raceResult.profileUrl ? (
                <a 
                  href={raceResult.profileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.profileLink}
                >
                  {raceResult.winner}
                </a>
              ) : (
                raceResult.winner
              )}
            </div>
            <div className={styles.trackName}>{raceResult.track}</div>
            <div className={styles.raceDate}>{raceResult.date}</div>
          </div>
          {raceResult.resultsUrl && raceResult.resultsUrl !== '#' && (
            <div className={styles.viewResults}>
              <a 
                href={raceResult.resultsUrl} 
                className={styles.resultsButton}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Full Results
              </a>
            </div>
          )}
        </div>
        {lastUpdated && (
          <div className={styles.lastUpdated}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </section>
  )
}