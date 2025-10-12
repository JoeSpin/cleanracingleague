import { NextRequest, NextResponse } from 'next/server'

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

interface LifetimeStatsResponse {
  series: string
  data: LifetimeStatsRow[]
  totalPages: number
  currentPage: number
  totalDrivers: number
  driversPerPage: number
  lastUpdated: string
}

const SERIES_CONFIG = {
  trucks: {
    url: 'https://www.simracerhub.com/league_stats.php?league_id=4807',
    name: 'Trucks'
  },
  arca: {
    url: 'https://www.simracerhub.com/league_stats.php?league_id=5983', 
    name: 'ARCA'
  },
  elite: {
    url: 'https://www.simracerhub.com/league_stats.php?league_id=5662',
    name: 'Elite'
  }
}

function parseLifetimeStats(html: string): { data: LifetimeStatsRow[], totalPages: number } {
  const stats: LifetimeStatsRow[] = []
  let totalPages = 1

  try {
    // Look for pagination info first
    const pageMatch = html.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
    if (pageMatch) {
      totalPages = parseInt(pageMatch[2]) || 1
    }

    // Find the stats table
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    let tableMatch
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1]
      
      // Look for rows with driver data
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1]
        
        // Skip header rows
        if (rowContent.includes('<th') || rowContent.includes('Driver') || rowContent.includes('Starts')) {
          continue
        }
        
        // Extract cells
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        const cells: string[] = []
        let cellMatch
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellText = cellMatch[1]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .trim()
          cells.push(cellText)
        }
        
        // Need at least 8-10 cells for a valid stats row
        if (cells.length >= 8) {
          // Common column structure for SimRacerHub lifetime stats:
          // Position, Driver, Starts, Wins, Top5, Top10, Poles, Laps, Incidents, Avg Finish, Best Finish, Championships
          
          const position = parseInt(cells[0]) || 0
          const driver = cells[1] || 'Unknown Driver'
          
          // Skip if not a valid position or driver name
          if (position === 0 || driver === '' || driver.length < 2) {
            continue
          }
          
          const starts = parseInt(cells[2]) || 0
          const wins = parseInt(cells[3]) || 0
          const top5 = parseInt(cells[4]) || 0
          const top10 = parseInt(cells[5]) || 0
          const poles = parseInt(cells[6]) || 0
          const laps = parseInt(cells[7]) || 0
          const incidents = parseInt(cells[8]) || 0
          const avgFinish = cells[9] || '0.0'
          const bestFinish = parseInt(cells[10]) || 999
          const championships = parseInt(cells[11]) || 0

          const statsRow: LifetimeStatsRow = {
            position,
            driver,
            starts,
            wins,
            top5,
            top10,
            poles,
            laps,
            incidents,
            avgFinish,
            bestFinish,
            championships
          }
          
          stats.push(statsRow)
        }
      }
    }
    
  } catch (error) {
    console.error('Error parsing lifetime stats:', error)
  }

  return { data: stats, totalPages }
}

async function fetchPage(seriesConfig: any, page: number = 1): Promise<{ data: LifetimeStatsRow[], totalPages: number, totalDrivers: number }> {
  let stats: LifetimeStatsRow[] = []
  let totalPages = 1
  let totalDrivers = 0
  
  try {
    const pageUrl = page === 1 ? seriesConfig.url : `${seriesConfig.url}&page=${page}`
    console.log(`Fetching ${seriesConfig.name} page ${page}: ${pageUrl}`)
    
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Clean Racing League Bot/1.0',
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.status}`)
    }
    
    const html = await response.text()
    const result = parseLifetimeStats(html)
    
    stats = result.data
    totalPages = result.totalPages
    
    // Calculate approximate total drivers (drivers per page * total pages)
    // This is an estimate since the last page might have fewer drivers
    const driversPerPage = stats.length
    totalDrivers = driversPerPage * totalPages
    
    console.log(`${seriesConfig.name} page ${page}: Found ${stats.length} drivers, ${totalPages} total pages`)
    
  } catch (error) {
    console.error(`Error fetching ${seriesConfig.name} page ${page}:`, error)
  }
  
  return { data: stats, totalPages, totalDrivers }
}

async function fetchAllPages(seriesConfig: any): Promise<{ data: LifetimeStatsRow[], totalPages: number, totalDrivers: number }> {
  let allStats: LifetimeStatsRow[] = []
  let totalPages = 1
  let totalDrivers = 0
  
  try {
    // First, fetch page 1 to determine total pages
    const firstPageResult = await fetchPage(seriesConfig, 1)
    
    allStats = firstPageResult.data
    totalPages = firstPageResult.totalPages
    totalDrivers = firstPageResult.totalDrivers
    
    console.log(`Found ${totalPages} pages for ${seriesConfig.name}`)
    
    // If there are multiple pages, fetch them all
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageResult = await fetchPage(seriesConfig, page)
          allStats = allStats.concat(pageResult.data)
          console.log(`Page ${page}: Found ${pageResult.data.length} drivers`)
          
          // Add small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError)
        }
      }
      
      // Update total drivers with actual count
      totalDrivers = allStats.length
    }
    
  } catch (error) {
    console.error('Error fetching lifetime stats:', error)
  }
  
  return { data: allStats, totalPages, totalDrivers }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const series = searchParams.get('series') as keyof typeof SERIES_CONFIG
  const page = parseInt(searchParams.get('page') || '1')
  const loadAll = searchParams.get('loadAll') === 'true'

  if (!series || !SERIES_CONFIG[series]) {
    return NextResponse.json(
      { error: 'Invalid series. Must be one of: trucks, arca, elite' },
      { status: 400 }
    )
  }

  if (page < 1) {
    return NextResponse.json(
      { error: 'Page must be a positive integer' },
      { status: 400 }
    )
  }

  try {
    const config = SERIES_CONFIG[series]
    console.log(`Fetching lifetime stats for ${config.name}...`)
    
    let result: { data: LifetimeStatsRow[], totalPages: number, totalDrivers: number }
    let currentPage = page
    let driversPerPage = 0

    if (loadAll) {
      // Load all pages at once (existing behavior)
      result = await fetchAllPages(config)
      currentPage = 1
      driversPerPage = result.data.length
    } else {
      // Load specific page
      result = await fetchPage(config, page)
      currentPage = page
      driversPerPage = result.data.length
      
      // Validate page exists
      if (page > result.totalPages) {
        return NextResponse.json(
          { error: `Page ${page} does not exist. Total pages: ${result.totalPages}` },
          { status: 404 }
        )
      }
    }
    
    console.log(`Total drivers found for ${config.name}: ${result.totalDrivers}`)

    const response: LifetimeStatsResponse = {
      series: config.name,
      data: result.data,
      totalPages: result.totalPages,
      currentPage: currentPage,
      totalDrivers: result.totalDrivers,
      driversPerPage: driversPerPage,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // Cache for 1 hour
      },
    })
    
  } catch (error) {
    console.error('Error fetching lifetime stats:', error)
    
    // Return mock data on error
    const mockData: LifetimeStatsRow[] = [
      {
        position: 1,
        driver: 'Sample Driver',
        starts: 45,
        wins: 12,
        top5: 25,
        top10: 35,
        poles: 8,
        laps: 12500,
        incidents: 15,
        avgFinish: '8.5',
        bestFinish: 1,
        championships: 2
      }
    ]

    const response: LifetimeStatsResponse = {
      series: SERIES_CONFIG[series].name,
      data: mockData,
      totalPages: 1,
      currentPage: page,
      totalDrivers: 1,
      driversPerPage: 1,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    })
  }
}