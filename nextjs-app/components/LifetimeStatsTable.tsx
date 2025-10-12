'use client'

import React, { useState, useEffect } from 'react'
import styles from './LifetimeStatsTable.module.css'

interface LifetimeStatsRow {
  position: number
  driver: string
  starts: number
  wins: number
  top5: number
  top10: number
  poles: number
  laps: number
  incidents: number
  avgFinish: string
  bestFinish: number
  championships: number
}

interface LifetimeStatsData {
  series: string
  data: LifetimeStatsRow[]
  totalPages: number
  currentPage: number
  totalDrivers: number
  driversPerPage: number
  lastUpdated: string
}

type SortKey = keyof LifetimeStatsRow
type SortDirection = 'asc' | 'desc'

interface LifetimeStatsTableProps {
  initialSeries?: string
}

const LifetimeStatsTable: React.FC<LifetimeStatsTableProps> = ({ 
  initialSeries = 'trucks' 
}) => {
  const [data, setData] = useState<LifetimeStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState(initialSeries)
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [loadAllPages, setLoadAllPages] = useState(false)

  const seriesOptions = [
    { value: 'trucks', label: 'Trucks Series' },
    { value: 'arca', label: 'ARCA Series' },
    { value: 'elite', label: 'Elite Series' }
  ]

  const columnConfig = [
    { key: 'position' as SortKey, label: 'Pos', sortable: true, align: 'center' },
    { key: 'driver' as SortKey, label: 'Driver', sortable: true, align: 'left' },
    { key: 'starts' as SortKey, label: 'Starts', sortable: true, align: 'center' },
    { key: 'wins' as SortKey, label: 'Wins', sortable: true, align: 'center' },
    { key: 'top5' as SortKey, label: 'Top 5', sortable: true, align: 'center' },
    { key: 'top10' as SortKey, label: 'Top 10', sortable: true, align: 'center' },
    { key: 'poles' as SortKey, label: 'Poles', sortable: true, align: 'center' },
    { key: 'laps' as SortKey, label: 'Laps', sortable: true, align: 'center' },
    { key: 'incidents' as SortKey, label: 'Inc.', sortable: true, align: 'center' },
    { key: 'avgFinish' as SortKey, label: 'Avg Fin', sortable: true, align: 'center' },
    { key: 'bestFinish' as SortKey, label: 'Best', sortable: true, align: 'center' },
    { key: 'championships' as SortKey, label: 'Titles', sortable: true, align: 'center' }
  ]

  useEffect(() => {
    setCurrentPage(1)
    fetchData()
  }, [selectedSeries])

  useEffect(() => {
    if (!loadAllPages) {
      fetchData()
    }
  }, [currentPage, loadAllPages])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        series: selectedSeries,
        page: currentPage.toString(),
        ...(loadAllPages && { loadAll: 'true' })
      })
      
      const response = await fetch(`/api/lifetime-stats?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      
    } catch (err) {
      console.error('Error fetching lifetime stats:', err)
      setError('Failed to load lifetime statistics. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const getSortedData = (): LifetimeStatsRow[] => {
    if (!data?.data) return []
    
    const sorted = [...data.data].sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      
      // Handle string values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // For avgFinish, convert to number for proper sorting
        if (sortKey === 'avgFinish') {
          aVal = parseFloat(aVal as string) || 999
          bVal = parseFloat(bVal as string) || 999
        } else {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }
      }
      
      // Handle numeric comparison
      const numA = typeof aVal === 'number' ? aVal : Number(aVal)
      const numB = typeof bVal === 'number' ? bVal : Number(bVal)
      
      if (sortDirection === 'asc') {
        return numA - numB
      } else {
        return numB - numA
      }
    })
    
    return sorted
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const formatValue = (key: SortKey, value: any) => {
    if (key === 'laps' && typeof value === 'number') {
      return value.toLocaleString()
    }
    if (key === 'avgFinish' && typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? value : num.toFixed(1)
    }
    return value
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading lifetime statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const sortedData = getSortedData()

  return (
    <div className={styles.container}>
      {/* Series Selector */}
      <div className={styles.controls}>
        <div className={styles.seriesSelector}>
          <label htmlFor="series-select">Series:</label>
          <select 
            id="series-select"
            value={selectedSeries} 
            onChange={(e) => setSelectedSeries(e.target.value)}
            className={styles.seriesSelect}
          >
            {seriesOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.paginationControls}>
          <label className={styles.loadAllToggle}>
            <input
              type="checkbox"
              checked={loadAllPages}
              onChange={(e) => setLoadAllPages(e.target.checked)}
            />
            Load all pages
          </label>
        </div>
        
        {data && (
          <div className={styles.info}>
            <span className={styles.driverCount}>
              {loadAllPages 
                ? `${data.totalDrivers} total drivers`
                : `${sortedData.length} drivers (Page ${data.currentPage} of ${data.totalPages})`
              }
            </span>
            <span className={styles.lastUpdated}>
              Updated: {new Date(data.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columnConfig.map((column) => (
                <th 
                  key={column.key}
                  className={`${styles.th} ${styles[column.align]} ${column.sortable ? styles.sortable : ''}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <span className={styles.headerContent}>
                    {column.label}
                    {column.sortable && (
                      <span className={styles.sortIcon}>
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr key={`${row.driver}-${index}`} className={styles.row}>
                {columnConfig.map((column) => (
                  <td 
                    key={column.key}
                    className={`${styles.td} ${styles[column.align]}`}
                  >
                    {formatValue(column.key, row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Navigation */}
      {data && !loadAllPages && data.totalPages > 1 && (
        <div className={styles.paginationNav}>
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
          >
            Previous
          </button>
          
          <div className={styles.pageNumbers}>
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              let pageNum
              if (data.totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= data.totalPages - 2) {
                pageNum = data.totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`${styles.pageButton} ${currentPage === pageNum ? styles.active : ''}`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(Math.min(data.totalPages, currentPage + 1))}
            disabled={currentPage === data.totalPages}
            className={`${styles.pageButton} ${currentPage === data.totalPages ? styles.disabled : ''}`}
          >
            Next
          </button>
        </div>
      )}

      {sortedData.length === 0 && (
        <div className={styles.noData}>
          <p>No lifetime statistics available for {data?.series || 'this series'}.</p>
        </div>
      )}
    </div>
  )
}

export default LifetimeStatsTable