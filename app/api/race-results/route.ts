import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get('league') || 'trucks';
    
    // Map leagues to series IDs (corrected to match standings API)
    const seriesConfig: Record<string, string> = {
      'trucks': '10554',
      'arca': '12526'
    };
    
    const seriesId = seriesConfig[league] || seriesConfig['trucks'];
    
    // Use the correct season_race.php URL (singular, not plural)
    const url = `https://www.simracerhub.com/scoring/season_race.php?series_id=${seriesId}`;
    
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch race data: ${response.status}`);
    }

    const html = await response.text();
    
    // More flexible parsing approach - look for any race-related data
    console.log('Fetched HTML length:', html.length); // Debug log
    
    // First try: Look for completed races in any table structure
    const allText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    console.log('Sample text:', allText.substring(0, 500)); // Debug log
    
    // Look for track names anywhere in the content
    const trackNames = [
      'Texas Motor Speedway', 'Talladega Superspeedway', 'Daytona International Speedway',
      'Charlotte Motor Speedway', 'Atlanta Motor Speedway', 'Las Vegas Motor Speedway',
      'Phoenix Raceway', 'Homestead-Miami Speedway', 'Kansas Speedway', 'Kentucky Speedway',
      'Michigan International Speedway', 'Auto Club Speedway', 'Indianapolis Motor Speedway',
      'Pocono Raceway', 'New Hampshire Motor Speedway', 'Dover International Speedway',
      'Martinsville Speedway', 'Richmond Raceway', 'Bristol Motor Speedway', 'Darlington Raceway',
      'Watkins Glen International', 'Sonoma Raceway', 'Road America', 'Chicagoland Speedway',
      'Iowa Speedway', 'Gateway Motorsports Park', 'Mid-Ohio Sports Car Course'
    ];
    
    let foundTrack = null;
    let foundWinner = null;
    let foundDate = null;
    
    // Find track name in content
    for (const track of trackNames) {
      if (html.includes(track)) {
        foundTrack = track;
        console.log('Found track:', track); // Debug log
        break;
      }
    }
    
    // If we found a track, try to find winner in any results table
    if (foundTrack) {
      // Look for ANY table that contains race results (position data)
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tableMatch;
      
      while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableContent = tableMatch[1];
        
        // Look for tables that contain position/results data
        if (tableContent.includes('POS') || tableContent.includes('Pos') || 
            tableContent.includes('Position') || tableContent.includes('P1') ||
            tableContent.includes('<td>1</td>') || tableContent.includes('>1<')) {
          
          console.log('Found results table'); // Debug log
          
          // Parse table rows to find the POS 1 winner
          const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let rowMatch;
          
          while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
            const rowContent = rowMatch[1];
            
            // Skip header rows
            if (rowContent.includes('<th')) {
              continue;
            }
            
            // Extract cells from this row
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const rowCells: string[] = [];
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
              rowCells.push(cellText);
            }
            
            if (rowCells.length > 0) {
              console.log('Row cells:', rowCells.slice(0, 5)); // Debug log - show first 5 cells
            }
            
            // Look for a row that contains "1" in the position column
            if (rowCells.length >= 2) {
              const positionCell = rowCells[0]?.trim();
              
              // Check if this is the first position (winner)
              if (positionCell === '1') {
                console.log('Found POS 1 row:', rowCells); // Debug log
                
                // Look for the driver name in the subsequent cells
                for (let i = 1; i < rowCells.length && i < 6; i++) { // Check first 5 cells after position
                  const cell = rowCells[i];
                  
                  // Check if this cell looks like a driver name
                  if (cell && 
                      cell.length > 3 && 
                      cell.length < 50 &&
                      /^[A-Za-z\s\-\.]+$/.test(cell) && // letters, spaces, hyphens, dots
                      !cell.includes('Speedway') &&
                      !cell.includes('Raceway') &&
                      !cell.includes('International') &&
                      !cell.includes('Motor') &&
                      !cell.includes('TBD') &&
                      !cell.includes('---') &&
                      !cell.includes('/') &&
                      !cell.match(/^\d+$/) && // not just numbers
                      !cell.includes('pts') &&
                      !cell.includes('laps') &&
                      !cell.includes('DNF') &&
                      !cell.includes('DNS') &&
                      cell.split(' ').length >= 2 // first and last name
                  ) {
                    foundWinner = cell;
                    console.log('Found winner in POS 1 row:', cell); // Debug log
                    break;
                  }
                }
                
                if (foundWinner) {
                  break;
                }
              }
            }
          }
          
          if (foundWinner) {
            break;
          }
        }
      }
    }
    
    // If we still don't have a winner, try a broader search
    if (foundTrack && !foundWinner) {
      console.log('Trying broader winner search'); // Debug log
      
      // Look for common driver name patterns in the HTML
      const driverPatterns = [
        /([A-Z][a-z]+ [A-Z][a-z]+)/g, // First Last
        /([A-Z]\. [A-Z][a-z]+)/g,     // J. Smith  
        /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/g // First M. Last
      ];
      
      for (const pattern of driverPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          // Filter out obvious non-driver names
          const validNames = matches.filter(name => 
            !name.includes('Motor') && 
            !name.includes('Speed') && 
            !name.includes('Track') &&
            !name.includes('Race') &&
            !name.includes('Racing') &&
            !name.includes('League') &&
            !name.includes('Series') &&
            !name.includes('Championship') &&
            !name.includes('Community') &&
            !name.includes('Calendar') &&
            !name.includes('Schedule') &&
            !name.includes('Content') &&
            !name.includes('Support') &&
            !name.includes('Patreon') &&
            !name.includes('iRacing') &&
            !name.includes('SimRacer') &&
            !name.includes('Subscribe') &&
            name.length < 30 &&
            name.length > 5 && // Must be longer than 5 characters
            !name.match(/^\d/) && // Don't start with numbers
            name.split(' ').length >= 2 // Must have at least 2 words (first/last name)
          );
          
          if (validNames.length > 0) {
            foundWinner = validNames[0];
            console.log('Found winner via pattern:', foundWinner); // Debug log
            break;
          }
        }
      }
    }
    
    if (!foundTrack) {
      console.log('No track found in HTML'); // Debug log
      throw new Error('No race track information found');
    }
    
    if (!foundWinner) {
      console.log('No winner found, using placeholder'); // Debug log
      foundWinner = 'Race Winner';
    }
    
    if (!foundDate) {
      foundDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      // Try to parse and reformat the found date
      try {
        const parsedDate = new Date(foundDate);
        if (!isNaN(parsedDate.getTime())) {
          foundDate = parsedDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      } catch (e) {
        // If parsing fails, use current date
        foundDate = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
    }

    return NextResponse.json({
      result: {
        track: foundTrack,
        winner: foundWinner,
        date: foundDate,
        resultsUrl: url // Include the SimRacerHub URL for "View Full Results"
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Race results API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch race results',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}
