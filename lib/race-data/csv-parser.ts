export interface RaceMetadata {
  league: string;
  series: string;
  season: string;
  raceDate: string;
  track: string;
  raceLaps: number;
  raceDuration: string;
  cautions: number;
  cautionLaps: number;
  leadChanges: number;
  leaders: number;
  raceNumber?: number; // Track race number in season
  isPlayoffRace?: boolean; // Indicates if this is a playoff race
  playoffRound?: 'regular' | 'round1' | 'round2' | 'championship'; // Which playoff round
}

export interface DriverResult {
  finish: number;
  finishClass: number;
  start: number;
  startClass: number;
  driver: string;
  license: string;
  iRating: number;
  safetyRating: number;
  totalPoints: number;
  racePoints: number;
  stagePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  interval: string;
  lapsCompleted: number;
  lapsLed: number;
  car: string;
  fastestLap: string;
  fastestLapNumber: string;
  averageLap: string;
  incidents: number;
  status: string;
  carNumber: string;
}

export interface RaceData {
  metadata: RaceMetadata;
  results: DriverResult[];
}

export interface PlayoffStandingsData {
  metadata: {
    league: string;
    series: string;
    season: string;
    playoffRound: string; // "Chase", "Round of 12", etc.
    updateDate: string;
    roundWinners?: string[]; // Drivers who won races in this specific playoff round
  };
  standings: PlayoffDriverStanding[];
}

export interface PlayoffDriverStanding {
  position: number;
  driver: string;
  points: number;
  wins: number; // Total wins for the season
  top5s: number;
  top10s: number;
  playoffPoints?: number; // Special playoff points if different from regular points
  eliminated?: boolean; // If driver is eliminated
  roundWins?: number; // Wins specifically in this playoff round
}

// Simple CSV parsing function
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

export function isPlayoffStandingsCSV(csvContent: string): boolean {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Check for explicit playoff indicators first
  let hasStandingsIndicators = false;
  let hasEmptyTrack = false;
  let hasZeroedRaceData = false;
  
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    
    // Look for standings-specific indicators
    if (line.toLowerCase().includes('playoff') || line.toLowerCase().includes('chase') || 
        line.toLowerCase().includes('round of')) {
      hasStandingsIndicators = true;
    }
    
    // Check for empty track (common in playoff standings)
    if (line.match(/^Track,\s*$/)) {
      hasEmptyTrack = true;
    }
    
    // Check for zeroed race data (indicates playoff standings format)
    if (line.match(/^"?Race Laps"?,\s*0\s*$/) || 
        line.match(/^"?Race Duration"?,\s*"?0h 0m 0s"?\s*$/) ||
        line.match(/^Cautions,\s*0\s*$/) ||
        line.match(/^"?Lead Changes"?,\s*0\s*$/)) {
      hasZeroedRaceData = true;
    }
  }
  
  // If explicit playoff indicators, definitely playoff standings
  if (hasStandingsIndicators) {
    return true;
  }
  
  // If empty track AND zeroed race data, likely playoff standings
  if (hasEmptyTrack && hasZeroedRaceData) {
    return true;
  }
  
  return false;
}

export function parsePlayoffStandingsCSV(csvContent: string): PlayoffStandingsData {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Parse metadata from first lines
  const metadata: Partial<PlayoffStandingsData['metadata']> = {};
  let dataStartIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the results header
    if (line.includes('Finish') && line.includes('Driver')) {
      dataStartIndex = i + 1;
      break;
    }
    
    // Parse metadata lines
    const metadataMatch = line.match(/^([^,]+),(.+)$/);
    if (metadataMatch) {
      const [, key, value] = metadataMatch;
      const cleanKey = key.replace(/"/g, '').trim();
      const cleanValue = value.replace(/"/g, '').trim();
      
      switch (cleanKey.toLowerCase()) {
        case 'league':
          metadata.league = cleanValue;
          break;
        case 'series':
          // Normalize series names to match component expectations
          if (cleanValue.toLowerCase().includes('arca')) {
            metadata.series = 'ARCA';
          } else if (cleanValue.toLowerCase().includes('truck')) {
            metadata.series = 'Truck';  
          } else {
            metadata.series = cleanValue;
          }
          break;
        case 'season':
          metadata.season = cleanValue;
          break;
        case 'type':
          // If Type field indicates playoff standings
          if (cleanValue.toLowerCase().includes('playoff') || cleanValue.toLowerCase().includes('chase') || cleanValue.toLowerCase().includes('standings')) {
            metadata.playoffRound = cleanValue;
          }
          break;
        case 'track':
          if (cleanValue.toLowerCase().includes('chase') || cleanValue.toLowerCase().includes('playoff')) {
            metadata.playoffRound = cleanValue;
          }
          break;
        case 'round':
          // Dedicated round field
          metadata.playoffRound = cleanValue;
          break;
        case 'race date':
          metadata.updateDate = cleanValue;
          // For playoff standings, this is the update date, not race date
          if (!metadata.playoffRound) {
            metadata.playoffRound = "Round of 12"; // Default assumption for playoff standings
          }
          break;
      }
    }
  }
  
  // Parse standings data
  const standings: PlayoffDriverStanding[] = [];
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    
    try {
      const row = parseCSVLine(line);
      if (row.length < 15) continue; // Need enough columns for driver data
      
      // Parse from the actual CSV structure we discovered
      // Driver is in column 6, Total Points in column 10
      const driver = (row[6] || '').replace(/"/g, '').trim(); // Driver name
      const totalPoints = parseInt(row[10]) || 0; // Total Points column
      
      // Since position isn't in the CSV, calculate from standings order
      let position = standings.length + 1;
      
      if (driver && totalPoints > 0) {
        const standing: PlayoffDriverStanding = {
          position: position,
          driver: driver,
          points: totalPoints,
          wins: 0, // Will be filled from existing season data
          top5s: 0, // Will be filled from existing season data  
          top10s: 0, // Will be filled from existing season data
          playoffPoints: totalPoints // Use total points as playoff points
        };
        
        standings.push(standing);
      }
    } catch (error) {
      console.warn('Failed to parse playoff standings line:', line, error);
    }
  }
  
  // Sort by points (highest first) and assign positions
  standings.sort((a, b) => b.points - a.points);
  standings.forEach((standing, index) => {
    standing.position = index + 1;
  });
  
  return {
    metadata: metadata as PlayoffStandingsData['metadata'],
    standings: standings
  };
}

export function parseRaceCSV(csvContent: string): RaceData {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Parse metadata from first lines
  const metadata: Partial<RaceMetadata> = {};
  let dataStartIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the results header (contains "Finish" and "Driver")
    if (line.includes('Finish') && line.includes('Driver') && line.includes('Total Points')) {
      dataStartIndex = i + 1;
      break;
    }
    
    // Parse metadata lines
    const metadataMatch = line.match(/^([^,]+),(.+)$/);
    if (metadataMatch) {
      const [, key, value] = metadataMatch;
      const cleanKey = key.replace(/"/g, '').trim();
      const cleanValue = value.replace(/"/g, '').trim();
      
      switch (cleanKey.toLowerCase()) {
        case 'league':
          metadata.league = cleanValue;
          break;
        case 'series':
          // Normalize series names to match component expectations
          if (cleanValue.toLowerCase().includes('arca')) {
            metadata.series = 'ARCA';
          } else if (cleanValue.toLowerCase().includes('truck')) {
            metadata.series = 'Truck';  
          } else {
            metadata.series = cleanValue;
          }
          break;
        case 'season':
          metadata.season = cleanValue;
          break;
        case 'race date':
          metadata.raceDate = cleanValue;
          break;
        case 'track':
          metadata.track = cleanValue;
          break;
        case 'race laps':
          metadata.raceLaps = parseInt(cleanValue) || 0;
          break;
        case 'race duration':
          metadata.raceDuration = cleanValue;
          break;
        case 'cautions':
          metadata.cautions = parseInt(cleanValue) || 0;
          break;
        case 'caution laps':
          metadata.cautionLaps = parseInt(cleanValue) || 0;
          break;
        case 'lead changes':
          metadata.leadChanges = parseInt(cleanValue) || 0;
          break;
        case 'leaders':
          metadata.leaders = parseInt(cleanValue) || 0;
          break;
      }
    }
  }
  
  // Parse driver results
  const resultsLines = lines.slice(dataStartIndex);
  const results: DriverResult[] = [];
  
  for (const line of resultsLines) {
    if (!line.trim()) continue;
    
    // Parse CSV line (handle quoted values)
    try {
      const row = parseCSVLine(line);
      
      if (row.length < 20) continue;
      
      // Skip if first column is empty (sometimes there are empty leading columns)
      let offset = 0;
      while (offset < row.length && (!row[offset] || row[offset].trim() === '')) {
        offset++;
      }
      
      if (offset >= row.length || !row[offset]) continue;
      
      const result: DriverResult = {
        finish: parseInt(row[offset]) || 0,
        finishClass: parseInt(row[offset + 1]) || 0,
        start: parseInt(row[offset + 2]) || 0,
        startClass: parseInt(row[offset + 3]) || 0,
        driver: (row[offset + 4] || '').replace(/"/g, '').trim(),
        license: (row[offset + 5] || '').replace(/"/g, '').trim(),
        iRating: parseInt(row[offset + 6]) || 0,
        safetyRating: parseFloat(row[offset + 7]) || 0,
        totalPoints: parseInt(row[offset + 8]) || 0,
        racePoints: parseInt(row[offset + 9]) || 0,
        stagePoints: parseInt(row[offset + 10]) || 0,
        bonusPoints: parseInt(row[offset + 11]) || 0,
        penaltyPoints: parseInt(row[offset + 12]) || 0,
        interval: (row[offset + 13] || '').replace(/"/g, '').trim(),
        lapsCompleted: parseInt(row[offset + 14]) || 0,
        lapsLed: parseInt(row[offset + 15]) || 0,
        car: (row[offset + 16] || '').replace(/"/g, '').trim(),
        fastestLap: (row[offset + 17] || '').replace(/"/g, '').trim(),
        fastestLapNumber: (row[offset + 18] || '').replace(/"/g, '').trim(),
        averageLap: (row[offset + 19] || '').replace(/"/g, '').trim(),
        incidents: parseInt(row[offset + 20]) || 0,
        status: (row[offset + 21] || '').replace(/"/g, '').trim(),
        carNumber: (row[offset + 22] || '').replace(/"/g, '').trim()
      };
      
      if (result.driver && result.finish > 0) {
        results.push(result);
      }
    } catch (error) {
      console.warn('Failed to parse line:', line, error);
    }
  }
  
  return {
    metadata: metadata as RaceMetadata,
    results: results.sort((a, b) => a.finish - b.finish)
  };
}

export function calculateSeasonStandings(races: RaceData[]): DriverStanding[] {
  const driverStats = new Map<string, {
    driver: string;
    totalPoints: number;
    wins: number;
    topFives: number;
    topTens: number;
    races: number;
    averageFinish: number;
    totalFinish: number;
    lapsLed: number;
    fastestLaps: number;
    incidents: number;
  }>();
  
  // Process each race
  for (const race of races) {
    for (const result of race.results) {
      const driver = result.driver;
      
      if (!driverStats.has(driver)) {
        driverStats.set(driver, {
          driver,
          totalPoints: 0,
          wins: 0,
          topFives: 0,
          topTens: 0,
          races: 0,
          averageFinish: 0,
          totalFinish: 0,
          lapsLed: 0,
          fastestLaps: 0,
          incidents: 0
        });
      }
      
      const stats = driverStats.get(driver)!;
      stats.totalPoints += result.totalPoints;
      stats.races++;
      stats.totalFinish += result.finish;
      stats.lapsLed += result.lapsLed;
      stats.incidents += result.incidents;
      
      if (result.finish === 1) stats.wins++;
      if (result.finish <= 5) stats.topFives++;
      if (result.finish <= 10) stats.topTens++;
      
      // Check for fastest lap (simple heuristic)
      if (result.fastestLap && result.fastestLap !== '-' && result.fastestLap.length > 0) {
        // This would need more sophisticated logic to determine if this was the race's fastest lap
        // For now, we'll skip this calculation
      }
    }
  }
  
  // Calculate averages and sort
  const standings: DriverStanding[] = [];
  for (const stats of driverStats.values()) {
    stats.averageFinish = stats.totalFinish / stats.races;
    standings.push({
      position: 0, // Will be set after sorting
      driver: stats.driver,
      points: stats.totalPoints,
      wins: stats.wins,
      top5s: stats.topFives,
      top10s: stats.topTens,
      averageFinish: parseFloat(stats.averageFinish.toFixed(1)),
      lapsLed: stats.lapsLed,
      incidents: stats.incidents
    });
  }
  
  // Sort by points (descending) and set positions
  standings.sort((a, b) => b.points - a.points);
  standings.forEach((standing, index) => {
    standing.position = index + 1;
  });
  
  return standings;
}

export interface DriverStanding {
  position: number;
  driver: string;
  points: number;
  wins: number;
  top5s: number;
  top10s: number;
  averageFinish: number;
  lapsLed: number;
  incidents: number;
}