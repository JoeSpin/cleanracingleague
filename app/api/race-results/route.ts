import { NextRequest, NextResponse } from 'next/server'

interface RaceResult {
  winner: string
  track: string
  date: string
  resultsUrl?: string
}

const SERIES_CONFIG = {
  trucks: {
    url: 'https://www.simracerhub.com/scoring/season_race.php?series_id=10554',
  },
  elite: {
    url: 'https://www.simracerhub.com/scoring/season_race.php?series_id=13239',
  },
  arca: {
    url: 'https://www.simracerhub.com/scoring/season_race.php?series_id=12526',
  },
}

function parseRaceResults(html: string, seriesUrl: string): RaceResult | null {
  try {
    console.log(`\n=== DEBUGGING RACE RESULTS PARSING ===`)
    console.log(`Series URL: ${seriesUrl}`)
    
    // Parse track name from h3 headers or page content (based on Python logic)
    let track = 'Unknown Track'
    
    // First try h3 headers - look for any text containing track-related keywords
    const h3Match = html.match(/<h3[^>]*>([^<]*(?:speedway|raceway|superspeedway|road|circuit|motorplex|park|international|motor|track)[^<]*)<\/h3>/i)
    if (h3Match) {
      track = h3Match[1].trim().replace(/\s+/g, ' ')
      console.log(`Found track in H3: ${track}`)
    } else {
      // Try h2 headers as well
      const h2Match = html.match(/<h2[^>]*>([^<]*(?:speedway|raceway|superspeedway|road|circuit|motorplex|park|international|motor|track)[^<]*)<\/h2>/i)
      if (h2Match) {
        track = h2Match[1].trim().replace(/\s+/g, ' ')
        console.log(`Found track in H2: ${track}`)
      } else {
        // Look for track names in page title or anywhere in content
        const titleMatch = html.match(/<title[^>]*>([^<]*(?:speedway|raceway|superspeedway|road|circuit|motorplex|park|international|motor|track)[^<]*)<\/title>/i)
        if (titleMatch) {
          track = titleMatch[1].trim().replace(/\s+/g, ' ')
          console.log(`Found track in title: ${track}`)
        } else {
          // Enhanced track name detection - look for specific track patterns first
          const specificTrackPatterns = [
            /TEXAS\s*MOTOR\s*SPEEDWAY/i,
            /CHARLOTTE\s*MOTOR\s*SPEEDWAY/i,
            /DAYTONA\s*INTERNATIONAL\s*SPEEDWAY/i,
            /TALLADEGA\s*SUPERSPEEDWAY/i,
            /ATLANTA\s*MOTOR\s*SPEEDWAY/i,
            /LAS\s*VEGAS\s*MOTOR\s*SPEEDWAY/i,
            /PHOENIX\s*RACEWAY/i,
            /HOMESTEAD[-\s]*MIAMI\s*SPEEDWAY/i,
            /KENTUCKY\s*SPEEDWAY/i,
            /POCONO\s*RACEWAY/i,
            /MICHIGAN\s*INTERNATIONAL\s*SPEEDWAY/i,
            /KANSAS\s*SPEEDWAY/i,
            /BRISTOL\s*MOTOR\s*SPEEDWAY/i,
            /MARTINSVILLE\s*SPEEDWAY/i,
            /RICHMOND\s*RACEWAY/i,
            /AUTO\s*CLUB\s*SPEEDWAY/i,
            /WATKINS\s*GLEN\s*INTERNATIONAL/i,
            /NEW\s*HAMPSHIRE\s*MOTOR\s*SPEEDWAY/i,
            /CHICAGO\s*STREET\s*COURSE/i,
            /ROAD\s*AMERICA/i
          ]
          
          // Try specific patterns first
          for (const pattern of specificTrackPatterns) {
            const match = html.match(pattern)
            if (match) {
              track = match[0].trim().replace(/\s+/g, ' ')
              console.log(`Found specific track pattern: ${track}`)
              break
            }
          }
          
          // If no specific pattern found, try general patterns
          if (track === 'Unknown Track') {
            // Look for any text that looks like a track name (contains common track keywords)
            const trackKeywords = [
              /([A-Za-z\s]+(?:speedway|raceway|superspeedway|road course|circuit|motorplex|park)[A-Za-z\s]*)/gi,
              /([A-Za-z\s]+(?:international|motor|track)[A-Za-z\s]*(?:speedway|raceway|superspeedway|road|circuit))/gi,
              // Common track patterns
            /HOMESTEAD[^<]*SPEEDWAY/i,
            /KENTUCKY[^<]*SPEEDWAY/i,
            /DAYTONA[^<]*SPEEDWAY/i,
            /TALLADEGA[^<]*SPEEDWAY/i,
            /PHOENIX[^<]*RACEWAY/i,
            /ATLANTA[^<]*SPEEDWAY/i,
            /LAS VEGAS[^<]*SPEEDWAY/i,
            /AUTO CLUB[^<]*SPEEDWAY/i,
            /POCONO[^<]*RACEWAY/i,
            /MICHIGAN[^<]*SPEEDWAY/i,
            /CHARLOTTE[^<]*SPEEDWAY/i,
            /TEXAS[^<]*SPEEDWAY/i,
            /KANSAS[^<]*SPEEDWAY/i,
            /CHICAGO[^<]*COURSE/i,
            /NEW HAMPSHIRE[^<]*SPEEDWAY/i,
            /WATKINS GLEN[^<]*INTERNATIONAL/i,
            /ROAD AMERICA/i,
            /RICHMOND[^<]*RACEWAY/i,
            /BRISTOL[^<]*SPEEDWAY/i,
            /MARTINSVILLE[^<]*SPEEDWAY/i,
            // Add more flexible patterns for other tracks
            /[A-Z][a-z]+\s*[A-Z][a-z]*\s*(?:Speedway|Raceway|Circuit|International|Motor|Park)/i
          ]
          
          for (const pattern of trackKeywords) {
            const matches = html.match(pattern)
            if (matches) {
              track = matches[0].trim().replace(/\s+/g, ' ')
              // Clean up track name
              track = track.replace(/^\W+|\W+$/g, '') // Remove leading/trailing non-word chars
              if (track.length > 3) {
                break
              }
            }
          }
        }
      }
    }
    
    // Extract winner from race results table (first row with position "1")
    let winner = 'Unknown Driver'
    
    // Look for table with position "1" in first cell
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    let tableMatch
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1]
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1]
        
        // Skip header rows
        if (rowContent.includes('<th')) {
          continue
        }
        
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        const cells = []
        let cellMatch
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellText = cellMatch[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
          cells.push(cellText)
        }
        
        // Check if first cell is position "1" or "1st"
        if (cells.length >= 2 && (cells[0] === '1' || cells[0] === '1st')) {
          // Look for driver name in cells - try different common positions
          const potentialNameCells = [1, 2, 3] // Driver name could be in columns 1, 2, or 3
          
          for (const cellIndex of potentialNameCells) {
            if (cellIndex < cells.length) {
              const cell = cells[cellIndex]
              // Check if this looks like a driver name (not just numbers, not empty, reasonable length)
              if (cell && 
                  cell.length > 2 && 
                  cell.length < 50 &&
                  !cell.match(/^\d+$/) && 
                  !cell.match(/^[\d.]+$/) &&
                  !cell.match(/^[+\-]?\d+$/) &&
                  !cell.match(/^\d{1,2}:\d{2}:\d{2}/) && // Not a time
                  cell.toLowerCase() !== 'dnf' &&
                  cell.toLowerCase() !== 'dns') {
                winner = cell.trim()
                break
              }
            }
          }
          
          if (winner !== 'Unknown Driver') {
            break
          }
        }
      }
      
      if (winner !== 'Unknown Driver') {
        break
      }
    }
    
    // Extract race date from header section
    let date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })
    
    // Look for various date patterns
    const datePatterns = [
      /([A-Z]{3}\s+\d{1,2},\s+\d{4})/i, // "Sep 29, 2025" or "OCT 1, 2025"
      /([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i, // "September 29, 2025"
      /(\d{1,2}\/\d{1,2}\/\d{4})/i, // "9/29/2025"
      /(\d{4}-\d{2}-\d{2})/i, // "2025-09-29"
      /([A-Z][a-z]{2,8}\s+\d{1,2}\s*,?\s*\d{4})/i // "September 29 2025"
    ]
    
    for (const pattern of datePatterns) {
      const match = html.match(pattern)
      if (match) {
        date = match[1].trim()
        break
      }
    }

    // Debug logging to help identify parsing issues
    console.log(`Race Results Parsing - Series URL: ${seriesUrl}`)
    console.log(`Parsed Winner: ${winner}`)
    console.log(`Parsed Track: ${track}`)
    console.log(`Parsed Date: ${date}`)

    return {
      winner,
      track,
      date,
      resultsUrl: seriesUrl // Use the SimRacerHub URL for the series
    };
  } catch (error) {
    console.error('Error parsing race results:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const league = searchParams.get('league') as keyof typeof SERIES_CONFIG

  if (!league || !SERIES_CONFIG[league]) {
    return NextResponse.json(
      { error: 'Invalid league. Must be one of: trucks, elite, arca' },
      { status: 400 }
    )
  }

  try {
    const config = SERIES_CONFIG[league]
    
    // Fetch race results from SimRacerHub
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Clean Racing League Bot/1.0',
      },
      // Cache for 30 minutes since race results update less frequently
      next: { revalidate: 1800 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch race results: ${response.status}`)
    }

    const html = await response.text()
    const raceResult = parseRaceResults(html, config.url)

    if (raceResult) {
      return NextResponse.json({
        result: raceResult,
        lastUpdated: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      })
    } else {
      throw new Error('Failed to parse race results')
    }
    
  } catch (error) {
    console.error('Error fetching race results:', error)
    
    // Return fallback mock data on error
    const mockResults: Record<string, RaceResult> = {
      trucks: {
        winner: 'John Smith',
        track: 'Charlotte Motor Speedway',
        date: 'October 3, 2025',
        resultsUrl: SERIES_CONFIG.trucks.url
      },
      elite: {
        winner: 'Sarah Johnson',
        track: 'Daytona International Speedway',
        date: 'October 2, 2025',
        resultsUrl: SERIES_CONFIG.elite.url
      },
      arca: {
        winner: 'Mike Wilson',
        track: 'Talladega Superspeedway',
        date: 'October 1, 2025',
        resultsUrl: SERIES_CONFIG.arca.url
      }
    }

    return NextResponse.json({
      result: mockResults[league],
      lastUpdated: new Date().toISOString()
    }, {
      status: 200, // Return 200 with fallback data
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    })
  }
}