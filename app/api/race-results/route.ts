import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get('league') || 'elite';
    
    // Map leagues to series IDs based on the standings API
    const seriesIds: Record<string, string> = {
      'elite': '10554',
      'trucks': '13239', 
      'arca': '12526'
    };
    
    const seriesId = seriesIds[league] || seriesIds['elite'];
    
    // Fetch the race results page from SimRacerHub
    const url = `https://www.simracerhub.com/scoring/season_race.php?series_id=${seriesId}`;
    const response = await fetch(url, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from SimRacerHub');
    }

    const html = await response.text();
    
    // Parse the HTML to find race results
    // Look for table rows containing race data - be more flexible with the search
    const raceRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const allRows = Array.from(html.matchAll(raceRowPattern));
    
    let latestRace = null;
    let latestWinner = null;
    
    // Parse each row to find the most recent completed race
    for (const rowMatch of allRows) {
      const row = rowMatch[0];
      
      // Skip header rows and empty rows
      if (row.includes('<th') || row.includes('colspan') || row.length < 50) {
        continue;
      }
      
      // Extract all cell data from this row
      const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = Array.from(row.matchAll(cellPattern));
      
      if (cells.length >= 2) {
        // Try to find cells that look like race data
        let trackData = '';
        let winnerData = '';
        
        for (let i = 0; i < cells.length && i < 5; i++) {
          const cellContent = cells[i]?.[1]?.replace(/<[^>]*>/g, '').trim();
          
          // Look for track names (usually contain "Speedway", "Raceway", "International", etc.)
          if (cellContent && (
            cellContent.includes('Speedway') || 
            cellContent.includes('Raceway') || 
            cellContent.includes('International') ||
            cellContent.includes('Motor') ||
            cellContent.includes('Superspeedway')
          )) {
            trackData = cellContent;
          }
          
          // Look for winner names (usually proper names, not numbers or dates)
          if (cellContent && 
              cellContent.length > 3 && 
              cellContent.length < 50 &&
              !cellContent.match(/^\d+$/) && // not just numbers
              !cellContent.includes('/') && // not dates
              !cellContent.includes(':') && // not times
              !cellContent.includes('TBD') &&
              !cellContent.includes('---') &&
              cellContent.match(/[A-Za-z]/) // contains letters
          ) {
            // Could be a winner name
            if (!winnerData || cellContent.length > winnerData.length) {
              winnerData = cellContent;
            }
          }
        }
        
        // If we found both track and winner data, this is likely a completed race
        if (trackData && winnerData) {
          latestRace = trackData;
          latestWinner = winnerData;
          break; // Take the first completed race we find
        }
      }
    }
    
    // If we couldn't parse the data, try a simpler approach
    if (!latestRace || !latestWinner) {
      // Look for any text that looks like track names and winner names
      const trackMatches = html.match(/(?:Texas Motor Speedway|Talladega Superspeedway|Daytona International Speedway|Charlotte Motor Speedway|Atlanta Motor Speedway|Las Vegas Motor Speedway|Phoenix Raceway|Homestead-Miami Speedway|Kansas Speedway|Kentucky Speedway|Michigan International Speedway|Auto Club Speedway|Indianapolis Motor Speedway|Pocono Raceway|New Hampshire Motor Speedway|Dover International Speedway|Martinsville Speedway|Richmond Raceway|Bristol Motor Speedway|Darlington Raceway|Watkins Glen International|Sonoma Raceway|Road America|Roval)/i);
      
      if (trackMatches) {
        latestRace = trackMatches[0];
        // For now, if we can't find winner, return track info with placeholder
        latestWinner = 'Race Winner';
      }
    }
    
    if (!latestRace || !latestWinner) {
      return NextResponse.json({
        result: null,
        lastUpdated: new Date().toISOString()
      });
    }

    return NextResponse.json({
      result: {
        track: latestRace,
        winner: latestWinner,
        date: new Date().toISOString().split('T')[0]
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Race results API error:', error);
    return NextResponse.json({ 
      result: null,
      lastUpdated: new Date().toISOString()
    });
  }
}
