import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== RACE RESULTS API CALLED ==='); // Debug log
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get('league') || 'trucks';
    
    // Map leagues to series IDs (corrected to match standings API)
    const seriesConfig: Record<string, string> = {
      'trucks': '10554',
      'arca': '12526'
    };
    
    const seriesId = seriesConfig[league] || seriesConfig['trucks'];
    
    // Try multiple endpoints to get the most recent race data
    const urlsToTry = [
      `https://www.simracerhub.com/scoring/season_race.php?series_id=${seriesId}`,
      `https://www.simracerhub.com/league.aspx?s=${seriesId}`,
      `https://www.simracerhub.com/scoring/schedule.php?series_id=${seriesId}`
    ];
    
    let html = '';
    let url = '';
    
    // Try each URL until we get valid data
    for (const tryUrl of urlsToTry) {
      try {
        console.log('Trying URL:', tryUrl); // Debug log
        const response = await fetch(tryUrl, {
          next: { revalidate: 300 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          html = await response.text();
          url = tryUrl;
          console.log('Successfully fetched from:', tryUrl); // Debug log
          
          // Check if this page has recent race data
          if (html.includes('POS') || html.includes('Position') || html.includes('Results')) {
            break;
          }
        }
      } catch (error) {
        console.log('Failed to fetch from:', tryUrl, error); // Debug log
        continue;
      }
    }
    
    if (!html) {
      throw new Error('Failed to fetch race data from any endpoint');
    }
    
    // More flexible parsing approach - look for any race-related data
    console.log('Fetched HTML length:', html.length); // Debug log
    console.log('URL fetched:', url); // Debug log
    
    // First try: Look for completed races in any table structure
    const allText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    console.log('Sample text:', allText.substring(0, 500)); // Debug log
    
    // Look for page title and race information
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      console.log('Page title:', titleMatch[1]); // Debug log
    }
    
    // Look for any date information on the page
    const dateMatches = html.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b[A-Z][a-z]+ \d{1,2}, \d{4}\b/g);
    if (dateMatches) {
      console.log('Found dates on page:', dateMatches.slice(0, 5)); // Debug log - first 5 dates
    }
    
    // Look for track name in h3.heading-track-name element
    let foundTrack = null;
    let foundWinner = null;
    let foundDate = null;
    
    // Extract track name from h3.heading-track-name
    const trackHeadingRegex = /<h3[^>]*class=['"][^'"]*heading-track-name[^'"]*['"][^>]*>([\s\S]*?)<\/h3>/gi;
    const trackMatch = trackHeadingRegex.exec(html);
    
    if (trackMatch) {
      foundTrack = trackMatch[1].replace(/<[^>]*>/g, '').trim();
      console.log('Found track from h3.heading-track-name:', foundTrack); // Debug log
      
      // Now look for the date in div.track-meta
      const trackMetaRegex = /<div[^>]*class=['"][^'"]*track-meta[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
      const trackMetaMatch = trackMetaRegex.exec(html);
      
      if (trackMetaMatch) {
        const trackMetaContent = trackMetaMatch[1];
        console.log('Found track-meta content:', trackMetaContent.substring(0, 200)); // Debug log
        
        // Extract date from track-meta content
        const dateMatch = trackMetaContent.match(/\b[A-Z][a-z]+ \d{1,2}, \d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/);
        if (dateMatch) {
          foundDate = dateMatch[0];
          console.log('Found date from track-meta:', foundDate); // Debug log
        }
      }
    } else {
      // Debug: Log all h3 elements on the page to see what's available
      const allH3s = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi);
      if (allH3s) {
        console.log('Found H3 elements on page:', allH3s.slice(0, 3).map(h3 => h3.substring(0, 100) + '...')); // Debug log
      }
      
      // Debug: Look for track-meta divs to see what's available
      const trackMetaDivs = html.match(/<div[^>]*class=['"][^'"]*track-meta[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi);
      if (trackMetaDivs) {
        console.log('Found track-meta divs:', trackMetaDivs.slice(0, 2).map(div => div.substring(0, 150) + '...')); // Debug log
      }
      
      // Try alternative patterns for the track name element
      const altTrackRegex = /<h3[^>]*class="[^"]*heading-track-name[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
      const altTrackMatch = altTrackRegex.exec(html);
      
      if (altTrackMatch) {
        foundTrack = altTrackMatch[1].replace(/<[^>]*>/g, '').trim();
        console.log('Found track from alternative h3.heading-track-name pattern:', foundTrack); // Debug log
      } else {
        console.log('No h3.heading-track-name found, checking page structure'); // Debug log
        
        // For leagues without h3.heading-track-name, try to get date from track-meta
        const trackMetaRegex = /<div[^>]*class=['"][^'"]*track-meta[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
        const trackMetaMatch = trackMetaRegex.exec(html);
        
        if (trackMetaMatch) {
          const trackMetaContent = trackMetaMatch[1];
          console.log('Found track-meta content (no h3):', trackMetaContent.substring(0, 200)); // Debug log
          
          // Extract date from track-meta content
          const dateMatch = trackMetaContent.match(/\b[A-Z][a-z]+ \d{1,2}, \d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/);
          if (dateMatch) {
            foundDate = dateMatch[0];
            console.log('Found date from track-meta (no h3):', foundDate); // Debug log
          }
        }
        
        // Try to find track name from page title or other sources
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) {
          const titleText = titleMatch[1].replace(/Sim Racer Hub:|Race Results/gi, '').trim();
          console.log('Page title for track extraction:', titleText); // Debug log
          
          // Look for track name patterns in title
          const trackInTitle = titleText.match(/([A-Z][a-z]+ )*[A-Z][a-z]+ (Motor Speedway|Speedway|Raceway|International|Circuit)/);
          if (trackInTitle) {
            foundTrack = trackInTitle[0];
            console.log('Found track from page title:', foundTrack); // Debug log
          }
        }
        
        // Try to find track name in breadcrumb or navigation elements
        const breadcrumbMatch = html.match(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/nav>/gi);
        if (breadcrumbMatch && !foundTrack) {
          console.log('Found breadcrumb, analyzing for track name...'); // Debug log
          for (const breadcrumb of breadcrumbMatch) {
            const trackInBreadcrumb = breadcrumb.match(/([A-Z][a-z]+ )*[A-Z][a-z]+ (Motor )?Speedway|Raceway|International/);
            if (trackInBreadcrumb) {
              foundTrack = trackInBreadcrumb[0];
              console.log('Found track in breadcrumb:', foundTrack); // Debug log
              break;
            }
          }
        }
        
        // Try to find track name in heading or container elements
        const headingMatches = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi);
        if (headingMatches && !foundTrack) {
          console.log('Searching headings for track names...'); // Debug log
          for (const heading of headingMatches) {
            const headingText = heading.replace(/<[^>]*>/g, '').trim();
            const trackInHeading = headingText.match(/^([A-Z][a-z]+ )*[A-Z][a-z]+ (Motor )?Speedway$|^([A-Z][a-z]+ )*[A-Z][a-z]+ Raceway$|^([A-Z][a-z]+ )*[A-Z][a-z]+ International$/);
            if (trackInHeading && headingText.length < 50) { // Avoid overly long headings
              foundTrack = headingText;
              console.log('Found track in heading:', foundTrack); // Debug log
              break;
            }
          }
        }
        
        // Try to find track name in span.track-name element specifically
        const trackNameSpanRegex = /<span[^>]*class=['"][^'"]*track-name[^'"]*['"][^>]*>([\s\S]*?)<\/span>/gi;
        const trackNameSpanMatch = trackNameSpanRegex.exec(html);
        
        if (trackNameSpanMatch && !foundTrack) {
          foundTrack = trackNameSpanMatch[1].replace(/<[^>]*>/g, '').trim();
          console.log('Found track from span.track-name:', foundTrack); // Debug log
        }
        
        // Try to find track name in span or div elements with specific classes
        const trackSpanMatch = html.match(/<(?:span|div)[^>]*class="[^"]*track[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/gi);
        if (trackSpanMatch && !foundTrack) {
          console.log('Searching track-related elements...'); // Debug log
          for (const trackElement of trackSpanMatch) {
            const trackText = trackElement.replace(/<[^>]*>/g, '').trim();
            const trackMatch = trackText.match(/^([A-Z][a-z]+ )*[A-Z][a-z]+ (Motor )?Speedway$|^([A-Z][a-z]+ )*[A-Z][a-z]+ Raceway$|^([A-Z][a-z]+ )*[A-Z][a-z]+ International$/);
            if (trackMatch && trackText.length < 50) {
              foundTrack = trackText;
              console.log('Found track in track element:', foundTrack); // Debug log
              break;
            }
          }
        }
        
        // Look for schedule information or race structure
        const scheduleMatch = html.match(/<div[^>]*class="[^"]*schedule[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
        if (scheduleMatch) {
          console.log('Found schedule section, analyzing...'); // Debug log
          // Try to find the most recent completed race
          for (const scheduleSection of scheduleMatch) {
            const trackInSchedule = scheduleSection.match(/([A-Z][a-z]+ )*[A-Z][a-z]+ (Motor )?Speedway|Raceway|International/);
            if (trackInSchedule) {
              console.log('Found track in schedule:', trackInSchedule[0]); // Debug log
            }
          }
        }
        
        // Fallback: Look for track names anywhere in the content (only if no track found yet)
        if (!foundTrack) {
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
          
          console.log('Searching for track names in HTML content...'); // Debug log
          for (const track of trackNames) {
            if (html.includes(track)) {
              foundTrack = track;
              console.log('Found track from fallback list:', track); // Debug log
              
              // Get some context around where this track name was found
              const trackIndex = html.indexOf(track);
              const contextStart = Math.max(0, trackIndex - 100);
              const contextEnd = Math.min(html.length, trackIndex + track.length + 100);
              const context = html.substring(contextStart, contextEnd);
              console.log('Track name context:', context.replace(/\s+/g, ' ')); // Debug log
              break;
            }
          }
        }
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
                console.log('Current track found:', foundTrack, 'Date found:', foundDate); // Debug log
                
                // Look for the driver name in the subsequent cells
                for (let i = 1; i < rowCells.length && i < 6; i++) { // Check first 5 cells after position
                  const cell = rowCells[i];
                  
                  // Check if this cell looks like a driver name
                  if (cell && 
                      cell.length > 3 && 
                      cell.length < 50 &&
                      /^[A-Za-z][A-Za-z\s\-\.0-9]*$/.test(cell) && // letters, spaces, hyphens, dots, numbers (must start with letter)
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
                      !cell.includes('Class') && // exclude class designations
                      cell.split(' ').length >= 1 // at least one word
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
