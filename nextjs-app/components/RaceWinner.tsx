'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './RaceWinner.module.css'

interface RaceWinnerProps {
  league: 'trucks' | 'elite' | 'arca'
}

interface RaceResult {
  winner: string
  track: string
  date: string
  resultsUrl?: string
}

interface RaceResultsResponse {
  result: RaceResult | null
  lastUpdated: string
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
        
        const response = await fetch(`/api/race-results?league=${league}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch race results')
        }
        
        const data: RaceResultsResponse = await response.json()
        
        setRaceResult(data.result)
        setLastUpdated(data.lastUpdated)
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
            <div className={styles.winnerName}>{raceResult.winner}</div>
            <div className={styles.trackName}>{raceResult.track}</div>
            <div className={styles.raceDate}>{raceResult.date}</div>
          </div>
          {raceResult.resultsUrl && (
            <div className={styles.viewResults}>
              <Link href={raceResult.resultsUrl} className={styles.resultsButton}>
                View Full Results
              </Link>
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