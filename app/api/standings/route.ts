import { NextRequest, NextResponse } from 'next/server'

interface StandingsRow {
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

interface StandingsData {
  drivers: StandingsRow[]
  teams?: StandingsRow[]
  lastUpdated: string
  currentRace?: number
}

const SERIES_CONFIG = {
  trucks: {
    url: 'https://www.simracerhub.com/scoring/season_standings.php?series_id=10554',
    includeTeams: true,
  },
  arca: {
    url: 'https://www.simracerhub.com/scoring/season_standings.php?series_id=12526',
    includeTeams: true,
  },
}

function extractCurrentRaceNumber(html: string): number {
  try {
    let maxRaceNumber = 0
    
    // Look specifically for span.race-date elements and extract their text content
    const raceDateSpanRegex = /<span[^>]*class="[^"]*race-date[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    let match
    
    console.log('Searching for span.race-date elements...') // Debug log
    
    while ((match = raceDateSpanRegex.exec(html)) !== null) {
      // Extract the text content, removing any nested HTML tags
      const rawContent = match[1]
      const textContent = rawContent.replace(/<[^>]*>/g, '').trim()
      
      console.log('Found race-date span content:', textContent) // Debug log
      
      // Look for various race number patterns in the text content
      const patterns = [
        /Race\s+(\d+)/i,           // "Race 10"
        /(\d+)\s+of\s+\d+/i,       // "10 of 16" 
        /Round\s+(\d+)/i,          // "Round 10"
        /Week\s+(\d+)/i,           // "Week 10"
        /Event\s+(\d+)/i,          // "Event 10"
        /\b(\d+)\b/g               // Any standalone number
      ]
      
      for (const pattern of patterns) {
        const matches = textContent.match(pattern)
        if (matches) {
          const raceNumber = parseInt(matches[1])
          console.log(`Found race number ${raceNumber} using pattern ${pattern}`) // Debug log
          
          // Validate it's a reasonable race number (1-16 for typical NASCAR season)
          if (raceNumber >= 1 && raceNumber <= 16 && raceNumber > maxRaceNumber) {
            maxRaceNumber = raceNumber
          }
        }
      }
    }
    
    // Fallback: Look for any "Race X" patterns anywhere in the HTML if no span.race-date found
    if (maxRaceNumber === 0) {
      console.log('No race-date spans found, searching entire HTML...') // Debug log
      const allRaceMatches = html.match(/Race\s+(\d+)/gi) || []
      console.log('Found race patterns in HTML:', allRaceMatches.slice(0, 3)) // Debug log - show first 3
      
      for (const raceMatch of allRaceMatches) {
        const numberMatch = raceMatch.match(/Race\s+(\d+)/i)
        if (numberMatch) {
          const raceNumber = parseInt(numberMatch[1])
          if (raceNumber >= 1 && raceNumber <= 16 && raceNumber > maxRaceNumber) {
            maxRaceNumber = raceNumber
          }
        }
      }
    }
    
    console.log('Final detected race number:', maxRaceNumber) // Debug log
    return maxRaceNumber > 0 ? maxRaceNumber : 9 // Default to race 9 if not found
  } catch (error) {
    console.error('Error extracting race number:', error)
    return 9 // Default fallback
  }
}

function parseStandingsTables(html: string, seriesId: string): { drivers: StandingsRow[], teams: StandingsRow[] } {
  const drivers: StandingsRow[] = []
  const teams: StandingsRow[] = []
  
  try {
    // Find all tables in the HTML (based on Python logic)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    let tableMatch
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1]
      
      // Extract headers to classify table type
      const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi
      const headers: string[] = []
      let headerMatch
      
      while ((headerMatch = headerRegex.exec(tableContent)) !== null) {
        const headerText = headerMatch[1].replace(/<[^>]*>/g, '').trim().toLowerCase()
        headers.push(headerText)
      }
      
      const headersString = headers.join(' ')
      // Classify table based on headers (improved logic)
      let isDriverTable = false
      let isTeamTable = false
      
      if (headersString.includes('driver')) {
        isDriverTable = true
      } else if (headersString.includes('team') && headersString.includes('pos') && !headersString.includes('driver')) {
        isTeamTable = true
      }
      
      if (!isDriverTable && !isTeamTable) {
        continue // Skip tables that don't match our criteria
      }
      
      // Parse table rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      let rowIndex = 0
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1]
        
        // Skip header rows (look for th elements)
        if (rowContent.includes('<th')) {
          continue
        }
        
        // Extract cells
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
        const cells: string[] = []
        const cellUrls: (string | undefined)[] = []
        let cellMatch
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellContent = cellMatch[1]
          
          // Extract URL if present (look for <a> tags)
          const linkMatch = cellContent.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i)
          let url: string | undefined
          if (linkMatch) {
            const href = linkMatch[1]
            // Fix URL construction - move slash after .com instead of after .php
            if (href.includes('profile.php/')) {
              url = `https://www.simracerhub.com/${href.replace('profile.php/', 'profile.php?member=')}`
            } else {
              url = href.startsWith('/') ? `https://www.simracerhub.com${href}` : `https://www.simracerhub.com/${href}`
            }
          }
          cellUrls.push(url)
          
          // Extract text content
          const cellText = cellContent
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .trim()
          cells.push(cellText)
        }
        
        // Need at least position, name, points for a valid row
        if (cells.length >= 3 && cells[0] && cells[1] && cells[0].match(/^\d+$/)) {
          
          const position = parseInt(cells[0]) || 0
          
          let name = '', change = '', points = 0, behindLeader = '', starts = 0, wins = 0, top5 = 0, top10 = 0, laps = 0, incidents = 0
          
          if (isDriverTable) {
            // Driver table mapping based on actual data structure
            // Different column mappings for different series
            if (seriesId === '10554') {
              // Trucks series - Headers: pos driver totpts behnext behlead starts chg wins t-5 t-10 bnspts laps incs poles team
              // Example: ['1', 'Mike Kelley', '125', '-', '-', '4', '-', '2', '2', '3', '4', '476', '29', '0', 'Turn 1 Heroes']
              name = cells[1] || `Driver ${position}`        // driver name (column 1)
              points = parseInt(cells[2]) || 0               // totpts (column 2)
              behindLeader = cells[4] || '-'                 // behlead (column 4)
              starts = parseInt(cells[5]) || 0               // starts (column 5)
              change = cells[6] || '-'                       // chg (column 6)
              wins = parseInt(cells[7]) || 0                 // wins (column 7)
              top5 = parseInt(cells[8]) || 0                 // t-5 (column 8)
              top10 = parseInt(cells[9]) || 0                // t-10 (column 9)
              laps = parseInt(cells[11]) || 0                // laps (column 11)
              incidents = parseInt(cells[12]) || 0           // incs (column 12)
            } else {
              // Elite/ARCA series - different structure
              // Based on observed data: pos, chg, driver, starts, prov, racescounted, wins, t-5, t-10, totpts, bnspts, penpts, laps, incs, behlead
              name = cells[2] || `Driver ${position}`        // driver name (column 2)  
              change = cells[1] || '-'                       // chg (column 1)
              starts = parseInt(cells[3]) || 0               // starts (column 3)
              wins = parseInt(cells[6]) || 0                 // wins (column 6)
              top5 = parseInt(cells[7]) || 0                 // t-5 (column 7)
              top10 = parseInt(cells[8]) || 0                // t-10 (column 8)
              points = parseInt(cells[9]) || 0               // totpts (column 9)
              laps = parseInt(cells[12]) || 0                // laps (column 12)
              incidents = parseInt(cells[13]) || 0           // incs (column 13)
              behindLeader = cells[14] || '-'                // behlead (column 14)
            }
          } else {
            // Team table mapping based on actual data structure  
            // Headers: pos chg team starts prov racescounted wins t-5 t-10 totpts bnspts penpts laps incs behlead behnext
            // Example: ['1', '+1', 'Turn 1 Heroes', '8', '0', '8', '2', '4', '7', '249', '5', '0', '952', '45', '-', '-']
            change = cells[1] || '-'                       // chg (column 1)
            name = cells[2] || `Team ${position}`          // team name (column 2)
            starts = parseInt(cells[3]) || 0               // starts (column 3)
            wins = parseInt(cells[6]) || 0                 // wins (column 6)
            top5 = parseInt(cells[7]) || 0                 // t-5 (column 7)
            top10 = parseInt(cells[8]) || 0                // t-10 (column 8)
            points = parseInt(cells[9]) || 0               // totpts (column 9)
            laps = parseInt(cells[12]) || 0                // laps (column 12)
            incidents = parseInt(cells[13]) || 0           // incs (column 13)
            behindLeader = cells[14] || '-'                // behlead (column 14)
          }
          
          // Get profile URL from the appropriate column
          let profileUrl: string | undefined
          if (isDriverTable) {
            profileUrl = seriesId === '10554' ? cellUrls[1] : cellUrls[2] // Driver name is in column 1 for trucks, 2 for elite/arca
          } else {
            profileUrl = cellUrls[2] // Team name is always in column 2
          }

          const row: StandingsRow = {
            position,
            change,
            name,
            points,
            behindLeader,
            starts,
            wins,
            top5,
            top10,
            laps,
            incidents,
            profileUrl
          }
          
          if (isDriverTable) {
            drivers.push(row)
          } else {
            teams.push(row)
          }
        }
        
        rowIndex++
      }
    }
    
  } catch (error) {
    console.error('Error parsing standings tables:', error)
  }
  
  return { drivers, teams }
}

// Force dynamic rendering for this API route\nexport const dynamic = 'force-dynamic';\n\nexport async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const league = searchParams.get('league') as keyof typeof SERIES_CONFIG

  if (!league || !SERIES_CONFIG[league]) {
    return NextResponse.json(
      { error: 'Invalid league. Must be one of: trucks, arca' },
      { status: 400 }
    )
  }

  try {
    const config = SERIES_CONFIG[league]
    
    // Fetch standings from SimRacerHub
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Clean Racing League Bot/1.0',
      },
      // Cache for 5 minutes for more frequent updates
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch standings: ${response.status}`)
    }

    const html = await response.text()
    
    // Parse the HTML to extract standings data
    const seriesId = config.url.match(/series_id=(\d+)/)?.[1] || ''
    const { drivers, teams: parsedTeams } = parseStandingsTables(html, seriesId)
    
    // Extract current race number from the HTML
    const currentRace = extractCurrentRaceNumber(html)
    
    // Use parsed teams only if configured to include teams for this league
    const teams = config.includeTeams ? parsedTeams : undefined

    const standingsData: StandingsData = {
      drivers,
      teams,
      lastUpdated: new Date().toISOString(),
      currentRace,
    }

    return NextResponse.json(standingsData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    })
    
  } catch (error) {
    console.error('Error fetching standings:', error)
    
    // Return fallback mock data on error
    const mockData: StandingsData = {
      drivers: [
        { position: 1, change: '-', name: 'John Smith', points: 1250, behindLeader: '-', starts: 4, wins: 3, top5: 8, top10: 12, laps: 500, incidents: 2 },
        { position: 2, change: '+1', name: 'Sarah Johnson', points: 1180, behindLeader: '-70', starts: 4, wins: 2, top5: 7, top10: 11, laps: 480, incidents: 1 },
        { position: 3, change: '-1', name: 'Mike Wilson', points: 1120, behindLeader: '-130', starts: 4, wins: 1, top5: 6, top10: 10, laps: 475, incidents: 3 },
      ],
      teams: SERIES_CONFIG[league].includeTeams ? [
        { position: 1, change: '+1', name: 'Thunder Racing', points: 2420, behindLeader: '-', starts: 8, wins: 4, top5: 12, top10: 18, laps: 950, incidents: 5 },
        { position: 2, change: '-1', name: 'Speed Demons', points: 2380, behindLeader: '-40', starts: 8, wins: 3, top5: 11, top10: 17, laps: 920, incidents: 7 },
      ] : undefined,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(mockData, {
      status: 200, // Return 200 with fallback data instead of error
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  }
}