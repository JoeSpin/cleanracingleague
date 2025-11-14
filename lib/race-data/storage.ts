import fs from 'fs/promises';
import path from 'path';
import { put, list } from '@vercel/blob';
import { RaceData, DriverStanding, DriverResult, calculateSeasonStandings, PlayoffStandingsData } from './csv-parser';
import { PLAYOFF_CONFIG } from '../playoff-config';

// Debug current working directory
console.log('process.cwd():', process.cwd());
console.log('__dirname equivalent:', path.dirname(__filename));

const DATA_DIR = path.join(process.cwd(), 'data');
console.log('DATA_DIR resolved to:', DATA_DIR);

export interface RaceWinner {
  driver: string;
  track: string;
  date: string;
  raceNumber?: number;
  lapsLed: number;
  margin: string;
  fastestLap?: string;
  profileUrl?: string;
}

export interface DriverSeasonStats {
  driver: string;
  totalPoints: number;
  wins: number;
  poles: number;
  top5s: number;
  top10s: number;
  dnfs: number;
  races: number;
  averageFinish: number;
  averageStart: number;
  totalLapsLed: number;
  totalIncidents: number;
  fastestLaps: number;
  stageWins: number;
  totalStagePoints: number;
  totalBonusPoints: number;
  totalPenaltyPoints: number;
  bestFinish: number;
  worstFinish: number;
  currentStreak: string; // "3 wins", "2 top 5s", etc.
  lastRaceFinish: number;
  lastRaceTrack: string;
  positionChange: string; // Track position change from previous race
}

export interface SeasonSummary {
  series: string;
  season: string;
  totalRaces: number;
  completedRaces: number;
  currentStandings: DriverSeasonStats[];
  raceWinners: RaceWinner[];
  lastUpdated: string;
  currentRace: number; // Current race number
  isPlayoffSeason: boolean; // Whether playoffs have started
  currentPlayoffRound: 'regular' | 'round1' | 'round2' | 'championship'; // Current playoff round
  seasonStats: {
    totalDrivers: number;
    averageLapsPerRace: number;
    totalIncidents: number;
    averageCautions: number;
    mostWins: { driver: string; wins: number };
    mostPoles: { driver: string; poles: number };
    mostLapsLed: { driver: string; laps: number };
  };
}

export interface SeasonData {
  series: string;
  season: string;
  races: RaceData[];
  lastUpdated: string;
}

export async function savePlayoffStandingsData(playoffData: PlayoffStandingsData): Promise<void> {
  // Ensure data directory exists
  await ensureDataDirectory();
  
  console.log('savePlayoffStandingsData called with:', {
    hasMetadata: !!playoffData.metadata,
    metadata: playoffData.metadata,
    standingsCount: playoffData.standings?.length || 0
  });
  
  if (!playoffData.metadata || !playoffData.metadata.series || !playoffData.metadata.season) {
    throw new Error(`Invalid playoff data: missing metadata. Got: ${JSON.stringify(playoffData.metadata)}`);
  }
  
  const series = playoffData.metadata.series.toLowerCase().replace(/\s+/g, '-');
  const season = playoffData.metadata.season.toLowerCase().replace(/\s+/g, '-');
  const seriesDir = path.join(DATA_DIR, series);
  const seasonFile = path.join(seriesDir, `${season}.json`);
  
  // Ensure series directory exists
  try {
    await fs.mkdir(seriesDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Load existing season data
  let seasonData: SeasonData;
  console.log('Looking for season file:', seasonFile);
  try {
    const existingData = await fs.readFile(seasonFile, 'utf-8');
    seasonData = JSON.parse(existingData);
    console.log('Loaded season data, races count:', seasonData.races?.length || 0);
  } catch (error) {
    console.log('Failed to load season data:', error);
    throw new Error(`No existing season data found for ${playoffData.metadata.series} ${playoffData.metadata.season}. Please upload race data first.`);
  }
  
  // Update playoff standings in the season summary
  // This will recalculate the summary with playoff-adjusted standings
  console.log('Calling calculateSeasonSummary with:', {
    racesCount: seasonData.races?.length || 0,
    series: playoffData.metadata.series,
    season: playoffData.metadata.season
  });
  const summary = await calculateSeasonSummary(seasonData.races, playoffData.metadata.series, playoffData.metadata.season);
  
  // Apply playoff standings adjustments - ADD playoff points to existing season totals
  const updatedStandings = summary.currentStandings.map(driver => {
    const playoffStanding = playoffData.standings.find(p => p.driver === driver.driver);
    if (playoffStanding) {
      // Get playoff points from CSV (these are the additional points earned in playoffs)
      const playoffPointsFromCSV = playoffStanding.playoffPoints || playoffStanding.points;
      
      // Calculate season playoff bonus points using configuration
      const { bonusPoints } = PLAYOFF_CONFIG;
      const playoffBonusPoints = (driver.wins * bonusPoints.winPoints) + ((driver.stageWins || 0) * bonusPoints.stageWinPoints);
      
      // ADD playoff points to existing season total (don't replace)
      const newTotalPoints = driver.totalPoints + playoffPointsFromCSV + playoffBonusPoints;
      
      console.log(`${driver.driver}: Season=${driver.totalPoints}, CSV Playoff=${playoffPointsFromCSV}, Bonus=${playoffBonusPoints} (${driver.wins} wins × ${bonusPoints.winPoints} + ${driver.stageWins || 0} stage wins × ${bonusPoints.stageWinPoints}), New Total=${newTotalPoints}`);
      
      return {
        ...driver,
        totalPoints: newTotalPoints,
        positionChange: '' // Will be calculated after sorting
      };
    }
    return driver;
  });
  
  // Sort by playoff points and calculate position changes
  const previousPositions = new Map(summary.currentStandings.map((driver, index) => [driver.driver, index]));
  updatedStandings.sort((a, b) => b.totalPoints - a.totalPoints);
  
  // Calculate position changes from playoff reset
  updatedStandings.forEach((driver, newIndex) => {
    const previousIndex = previousPositions.get(driver.driver);
    if (previousIndex !== undefined) {
      const change = previousIndex - newIndex;
      if (change > 0) {
        driver.positionChange = `+${change}`;
      } else if (change < 0) {
        driver.positionChange = `${change}`;
      } else {
        driver.positionChange = '0';
      }
    } else {
      driver.positionChange = 'NEW';
    }
  });
  
  summary.currentStandings = updatedStandings;
  
  // Mark as playoff season
  summary.isPlayoffSeason = true;
  summary.currentPlayoffRound = getPlayoffRoundFromName(playoffData.metadata.playoffRound);
  
  // Save updated summary
  const summaryFile = path.join(seriesDir, `${season}-summary.json`);
  await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
  
  // Also save the raw playoff data for reference
  const playoffFile = path.join(seriesDir, `${season}-playoff-${Date.now()}.json`);
  await fs.writeFile(playoffFile, JSON.stringify(playoffData, null, 2));
}

function getPlayoffRoundFromName(roundName: string): 'regular' | 'round1' | 'round2' | 'championship' {
  const lowerName = roundName.toLowerCase();
  if (lowerName.includes('championship') || lowerName.includes('final')) {
    return 'championship';
  } else if (lowerName.includes('round of 8') || lowerName.includes('round 2')) {
    return 'round2';
  } else if (lowerName.includes('round of 12') || lowerName.includes('round 1')) {
    return 'round1';
  }
  return 'round1'; // Default to round1 for "Chase" uploads
}

export async function saveRaceData(raceData: RaceData, raceNumberOverride?: number): Promise<void> {
  console.log('=== saveRaceData called ===');
  console.log('Race data:', {
    series: raceData.metadata.series,
    season: raceData.metadata.season,
    track: raceData.metadata.track
  });

  // Use Vercel Blob storage in production, local filesystem in development
  const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (useBlob) {
    console.log('Using Vercel Blob storage for production');
    await saveToBlobStorage(raceData, raceNumberOverride);
    return;
  }
  
  console.log('Using local filesystem for development');
  
  // Ensure data directory exists and get runtime path
  console.log('Ensuring data directory exists...');
  await ensureDataDirectory();
  
  // Use the runtime data directory that was verified to work
  const runtimeDataDir = (global as any).RUNTIME_DATA_DIR || DATA_DIR;
  console.log('Using runtime data directory:', runtimeDataDir);
  
  const series = raceData.metadata.series.toLowerCase().replace(/\s+/g, '-');
  const season = raceData.metadata.season.toLowerCase().replace(/\s+/g, '-');
  const seriesDir = path.join(runtimeDataDir, series);
  const seasonFile = path.join(seriesDir, `${season}.json`);
  
  console.log('Paths:', {
    runtimeDataDir,
    series,
    season,
    seriesDir,
    seasonFile
  });
  
  // Ensure series directory exists
  console.log('Creating series directory:', seriesDir);
  try {
    await fs.mkdir(seriesDir, { recursive: true });
    console.log('Series directory created successfully');
  } catch (error) {
    console.error('Failed to create series directory:', error);
    throw new Error(`Failed to create directory ${seriesDir}: ${error}`);
  }
  
  // Load existing season data or create new
  let seasonData: SeasonData;
  try {
    const existingData = await fs.readFile(seasonFile, 'utf-8');
    seasonData = JSON.parse(existingData);
  } catch (error) {
    seasonData = {
      series: raceData.metadata.series,
      season: raceData.metadata.season,
      races: [],
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Apply race number override if specified
  if (raceNumberOverride) {
    raceData.metadata.raceNumber = raceNumberOverride;
    
    // Check if race already exists by race number - REPLACE if found
    const existingRaceIndex = seasonData.races.findIndex(race => 
      race.metadata.raceNumber === raceNumberOverride
    );
    
    if (existingRaceIndex >= 0) {
      // Replace existing race with same number (no duplicates)
      console.log(`Replacing existing race ${raceNumberOverride}: ${seasonData.races[existingRaceIndex].metadata.track} -> ${raceData.metadata.track}`);
      seasonData.races[existingRaceIndex] = raceData;
    } else {
      // Add new race and sort by race number
      console.log(`Adding new race ${raceNumberOverride}: ${raceData.metadata.track}`);
      seasonData.races.push(raceData);
      seasonData.races.sort((a, b) => (a.metadata.raceNumber || 0) - (b.metadata.raceNumber || 0));
    }
  } else {
    // Check if race already exists (by date and track) - REPLACE if found
    const existingRaceIndex = seasonData.races.findIndex(race => 
      race.metadata.raceDate === raceData.metadata.raceDate && 
      race.metadata.track === raceData.metadata.track
    );
    
    if (existingRaceIndex >= 0) {
      // Replace existing race (no duplicates)
      console.log(`Replacing existing race: ${seasonData.races[existingRaceIndex].metadata.track} on ${raceData.metadata.raceDate}`);
      seasonData.races[existingRaceIndex] = raceData;
    } else {
      // Add new race
      console.log(`Adding new race: ${raceData.metadata.track} on ${raceData.metadata.raceDate}`);
      seasonData.races.push(raceData);
    }
    
    // Sort races by date and assign sequential race numbers
    seasonData.races.sort((a, b) => new Date(a.metadata.raceDate).getTime() - new Date(b.metadata.raceDate).getTime());
    
    seasonData.races.forEach((race, index) => {
      race.metadata.raceNumber = index + 1;
    });
  }
  
  // Determine playoff information for all races
  seasonData.races.forEach((race) => {
    const raceNumber = race.metadata.raceNumber || 1;
    
    // Determine playoff round based on race number
    if (PLAYOFF_CONFIG.rounds.regular.races.includes(raceNumber)) {
      race.metadata.isPlayoffRace = false;
      race.metadata.playoffRound = 'regular';
    } else if (PLAYOFF_CONFIG.rounds.round1.races.includes(raceNumber)) {
      race.metadata.isPlayoffRace = true;
      race.metadata.playoffRound = 'round1';
    } else if (PLAYOFF_CONFIG.rounds.round2.races.includes(raceNumber)) {
      race.metadata.isPlayoffRace = true;
      race.metadata.playoffRound = 'round2';
    } else if (PLAYOFF_CONFIG.rounds.championship.races.includes(raceNumber)) {
      race.metadata.isPlayoffRace = true;
      race.metadata.playoffRound = 'championship';
    } else {
      race.metadata.isPlayoffRace = false;
      race.metadata.playoffRound = 'regular';
    }
  });
  
  seasonData.lastUpdated = new Date().toISOString();
  
  // Save updated season data
  console.log('Writing season file:', seasonFile);
  try {
    await fs.writeFile(seasonFile, JSON.stringify(seasonData, null, 2));
    console.log('Season file written successfully');
  } catch (error) {
    console.error('Failed to write season file:', error);
    throw new Error(`Failed to write season file ${seasonFile}: ${error}`);
  }
  
  // Also save a comprehensive season summary with playoff information
  console.log('Calculating season summary...');
  const summary = await calculateSeasonSummary(seasonData.races, raceData.metadata.series, raceData.metadata.season);
  const summaryFile = path.join(seriesDir, `${season}-summary.json`);
  
  console.log('Writing summary file:', summaryFile);
  try {
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    console.log('Summary file written successfully');
  } catch (error) {
    console.error('Failed to write summary file:', error);
    throw new Error(`Failed to write summary file ${summaryFile}: ${error}`);
  }
  
  console.log('=== saveRaceData completed successfully ===');
}

export function calculateSeasonSummary(races: RaceData[], series: string, season: string): SeasonSummary {
  const driverStats = new Map<string, DriverSeasonStats>();
  const raceWinners: RaceWinner[] = [];
  
  // Helper function to calculate standings for subset of races
  const calculateStandingsForRaces = (raceSubset: RaceData[]): DriverSeasonStats[] => {
    const tempStats = new Map<string, DriverSeasonStats>();
    
    raceSubset.forEach(race => {
      race.results.forEach(result => {
        if (!tempStats.has(result.driver)) {
          tempStats.set(result.driver, {
            driver: result.driver,
            totalPoints: 0,
            wins: 0, poles: 0, top5s: 0, top10s: 0, dnfs: 0, races: 0,
            averageFinish: 0, averageStart: 0, totalLapsLed: 0, totalIncidents: 0,
            fastestLaps: 0, stageWins: 0, totalStagePoints: 0, totalBonusPoints: 0,
            totalPenaltyPoints: 0, bestFinish: 999, worstFinish: 1,
            currentStreak: '', lastRaceFinish: 0, lastRaceTrack: '',
            positionChange: ''
          });
        }
        const stats = tempStats.get(result.driver)!;
        stats.totalPoints += result.totalPoints;
        stats.races++;
      });
    });
    
    const standings = Array.from(tempStats.values());
    standings.sort((a, b) => b.totalPoints - a.totalPoints);
    return standings;
  };
  
  // Initialize stats tracking
  let totalLapsAllRaces = 0;
  let totalCautions = 0;
  let allDrivers = new Set<string>();
  let totalIncidents = 0;
  
  // Process each race
  races.forEach((race, raceIndex) => {
    const raceNumber = raceIndex + 1;
    totalLapsAllRaces += race.metadata.raceLaps || 0;
    totalCautions += race.metadata.cautions || 0;
    
    // Get race winner
    const winner = race.results[0];
    if (winner) {
      raceWinners.push({
        driver: winner.driver,
        track: race.metadata.track,
        date: race.metadata.raceDate,
        raceNumber,
        lapsLed: winner.lapsLed,
        margin: winner.interval || '-',
        fastestLap: winner.fastestLap
      });
    }
    
    // Process each driver's result
    race.results.forEach(result => {
      allDrivers.add(result.driver);
      totalIncidents += result.incidents;
      
      if (!driverStats.has(result.driver)) {
        driverStats.set(result.driver, {
          driver: result.driver,
          totalPoints: 0,
          wins: 0,
          poles: 0,
          top5s: 0,
          top10s: 0,
          dnfs: 0,
          races: 0,
          averageFinish: 0,
          averageStart: 0,
          totalLapsLed: 0,
          totalIncidents: 0,
          fastestLaps: 0,
          stageWins: 0,
          totalStagePoints: 0,
          totalBonusPoints: 0,
          totalPenaltyPoints: 0,
          bestFinish: 999,
          worstFinish: 1,
          currentStreak: '',
          lastRaceFinish: result.finish,
          lastRaceTrack: race.metadata.track,
          positionChange: ''
        });
      }
      
      const stats = driverStats.get(result.driver)!;
      
      // Update cumulative stats
      stats.totalPoints += result.totalPoints;
      stats.races++;
      stats.totalLapsLed += result.lapsLed;
      stats.totalIncidents += result.incidents;
      stats.totalStagePoints += result.stagePoints;
      stats.totalBonusPoints += result.bonusPoints;
      stats.totalPenaltyPoints += result.penaltyPoints;
      stats.lastRaceFinish = result.finish;
      stats.lastRaceTrack = race.metadata.track;
      
      // Track wins and special achievements
      if (result.finish === 1) stats.wins++;
      if (result.start === 1) stats.poles++;
      if (result.finish <= 5) stats.top5s++;
      if (result.finish <= 10) stats.top10s++;
      if (result.status.toLowerCase().includes('disconnect') || 
          result.status.toLowerCase().includes('dnf')) stats.dnfs++;
      
      // Track stage wins (estimate based on stage points)
      // Each stage win typically gives 10 points, so if they have stage points, count as stage wins
      if (result.stagePoints >= 10) {
        stats.stageWins += Math.floor(result.stagePoints / 10);
      } else if (result.stagePoints > 0) {
        // If they have some stage points (1-9), they likely won at least one stage
        stats.stageWins += 1;
      }
      
      // Track best/worst finishes
      if (result.finish < stats.bestFinish) stats.bestFinish = result.finish;
      if (result.finish > stats.worstFinish) stats.worstFinish = result.finish;
    });
  });
  
  // Calculate averages and finalize stats
  const standings: DriverSeasonStats[] = [];
  for (const stats of driverStats.values()) {
    if (stats.races > 0) {
      stats.averageFinish = parseFloat((stats.totalPoints / stats.races).toFixed(1));
      // Calculate current streak (simplified)
      if (stats.lastRaceFinish === 1) {
        stats.currentStreak = 'Won last race';
      } else if (stats.lastRaceFinish <= 5) {
        stats.currentStreak = 'Top 5 last race';
      } else if (stats.lastRaceFinish <= 10) {
        stats.currentStreak = 'Top 10 last race';
      } else {
        stats.currentStreak = `Finished ${stats.lastRaceFinish}`;
      }
      
      standings.push(stats);
    }
  }
  
  // Sort by total points
  standings.sort((a, b) => b.totalPoints - a.totalPoints);
  
  // Calculate position changes (need previous race standings for comparison)
  if (races.length > 1) {
    // Calculate standings after previous race
    const previousRaceStandings = calculateStandingsForRaces(races.slice(0, -1));
    
    standings.forEach((currentStats, currentIndex) => {
      const previousPosition = previousRaceStandings.findIndex(
        (prevStats: DriverSeasonStats) => prevStats.driver === currentStats.driver
      );
      
      if (previousPosition >= 0) {
        const change = previousPosition - currentIndex;
        if (change > 0) {
          currentStats.positionChange = `+${change}`;
        } else if (change < 0) {
          currentStats.positionChange = `${change}`;
        } else {
          currentStats.positionChange = '0';
        }
      } else {
        // New driver this season
        currentStats.positionChange = 'NEW';
      }
    });
  } else {
    // First race of season - no position changes
    standings.forEach(stats => {
      stats.positionChange = '--';
    });
  }
  
  // Calculate season-wide statistics
  const mostWins = standings.reduce((max, driver) => 
    driver.wins > max.wins ? driver : max, standings[0] || { driver: '', wins: 0 });
  
  const mostPoles = standings.reduce((max, driver) => 
    driver.poles > max.poles ? driver : max, standings[0] || { driver: '', poles: 0 });
  
  const mostLapsLed = standings.reduce((max, driver) => 
    driver.totalLapsLed > max.totalLapsLed ? driver : max, standings[0] || { driver: '', totalLapsLed: 0 });
  
  // Determine current playoff status
  const currentRace = races.length;
  let currentPlayoffRound: 'regular' | 'round1' | 'round2' | 'championship' = 'regular';
  let isPlayoffSeason = false;
  
  if (PLAYOFF_CONFIG.rounds.championship.races.includes(currentRace)) {
    currentPlayoffRound = 'championship';
    isPlayoffSeason = true;
  } else if (PLAYOFF_CONFIG.rounds.round2.races.includes(currentRace)) {
    currentPlayoffRound = 'round2';
    isPlayoffSeason = true;
  } else if (PLAYOFF_CONFIG.rounds.round1.races.includes(currentRace)) {
    currentPlayoffRound = 'round1';
    isPlayoffSeason = true;
  } else {
    currentPlayoffRound = 'regular';
    isPlayoffSeason = false;
  }
  
  return {
    series,
    season,
    totalRaces: races.length,
    completedRaces: races.length,
    currentRace,
    isPlayoffSeason,
    currentPlayoffRound,
    currentStandings: standings,
    raceWinners,
    lastUpdated: new Date().toISOString(),
    seasonStats: {
      totalDrivers: allDrivers.size,
      averageLapsPerRace: races.length > 0 ? Math.round(totalLapsAllRaces / races.length) : 0,
      totalIncidents,
      averageCautions: races.length > 0 ? Math.round(totalCautions / races.length) : 0,
      mostWins: { driver: mostWins.driver, wins: mostWins.wins },
      mostPoles: { driver: mostPoles.driver, poles: mostPoles.poles },
      mostLapsLed: { driver: mostLapsLed.driver, laps: mostLapsLed.totalLapsLed }
    }
  };
}

export async function getSeasonStandings(series: string, season: string): Promise<DriverStanding[]> {
  const summary = await getSeasonSummary(series, season);
  if (!summary) return [];
  
  // Convert DriverSeasonStats to DriverStanding format
  return summary.currentStandings.map((stats, index) => ({
    position: index + 1,
    driver: stats.driver,
    points: stats.totalPoints,
    wins: stats.wins,
    top5s: stats.top5s,
    top10s: stats.top10s,
    averageFinish: stats.averageFinish,
    lapsLed: stats.totalLapsLed,
    incidents: stats.totalIncidents
  }));
}

export async function getLatestRaceResult(series: string, season: string): Promise<RaceData | null> {
  const seasonData = await getSeasonData(series, season);
  if (!seasonData || seasonData.races.length === 0) return null;
  
  // Return the most recent race
  return seasonData.races[seasonData.races.length - 1];
}

export async function getAllRaces(series: string, season: string): Promise<RaceData[]> {
  const seasonData = await getSeasonData(series, season);
  return seasonData?.races || [];
}

// List available seasons from Vercel Blob Storage
async function listSeasonsFromBlob(): Promise<{ series: string; seasons: string[] }[]> {
  try {
    const { blobs } = await list({ 
      token: process.env.crl_READ_WRITE_TOKEN 
    });
    
    console.log('Available blobs for listing seasons:', blobs.map(b => b.pathname));
    
    // Group blobs by series
    const seriesMap = new Map<string, Set<string>>();
    
    for (const blob of blobs) {
      // Parse pathname like "truck/crl-truck-series-season-24.json"
      const parts = blob.pathname.split('/');
      if (parts.length === 2) {
        const series = parts[0];
        const fileName = parts[1];
        
        // Extract season name (remove .json extension)
        if (fileName.endsWith('.json') && !fileName.endsWith('-summary.json')) {
          const season = fileName.replace('.json', '');
          
          if (!seriesMap.has(series)) {
            seriesMap.set(series, new Set());
          }
          seriesMap.get(series)!.add(season);
        }
      }
    }
    
    // Convert to expected format
    const result = [];
    for (const [series, seasonsSet] of seriesMap) {
      result.push({
        series,
        seasons: Array.from(seasonsSet)
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error listing seasons from blob:', error);
    return [];
  }
}

// Load season data from Vercel Blob Storage
async function loadFromBlobStorage(seriesSlug: string, seasonSlug: string): Promise<SeasonData | null> {
  try {
    const fileName = `${seriesSlug}/${seasonSlug}.json`;
    console.log('Attempting to load from blob storage:', fileName);
    
    // List all blobs to see what exists
    const { blobs } = await list({ 
      token: process.env.crl_READ_WRITE_TOKEN 
    });
    
    console.log('Available blobs:', blobs.map(b => b.pathname));
    
    // Find the specific file
    const targetBlob = blobs.find(blob => blob.pathname === fileName);
    
    if (!targetBlob) {
      console.log('File not found in blob storage:', fileName);
      return null;
    }
    
    console.log('Found blob:', targetBlob.url);
    
    // Fetch the blob content
    const response = await fetch(targetBlob.url);
    if (!response.ok) {
      console.error('Failed to fetch blob:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log('Successfully loaded season data from blob storage');
    return data;
    
  } catch (error) {
    console.error('Error loading from blob storage:', error);
    return null;
  }
}

export async function getSeasonData(series: string, season: string): Promise<SeasonData | null> {
  try {
    const seriesSlug = series.toLowerCase().replace(/\s+/g, '-');
    const seasonSlug = season.toLowerCase().replace(/\s+/g, '-');
    
    // Use blob storage in production, local filesystem in development
    const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (useBlob) {
      console.log('Loading season data from blob storage');
      return await loadFromBlobStorage(seriesSlug, seasonSlug);
    } else {
      console.log('Loading season data from local filesystem');
      const seasonFile = path.join(DATA_DIR, seriesSlug, `${seasonSlug}.json`);
      const data = await fs.readFile(seasonFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading season data:', error);
    return null;
  }
}

export async function listAvailableSeasons(): Promise<{ series: string; seasons: string[] }[]> {
  try {
    // Use blob storage in production, local filesystem in development
    const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (useBlob) {
      console.log('Listing seasons from blob storage');
      return await listSeasonsFromBlob();
    } else {
      console.log('Listing seasons from local filesystem');
      await ensureDataDirectory();
      const seriesDirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
      
      const result = [];
      for (const seriesDir of seriesDirs) {
        if (seriesDir.isDirectory()) {
          try {
            const seasonFiles = await fs.readdir(path.join(DATA_DIR, seriesDir.name));
            const seasons = seasonFiles
              .filter(file => file.endsWith('.json'))
              .map(file => file.replace('.json', ''));
            
            if (seasons.length > 0) {
              result.push({
                series: seriesDir.name,
                seasons
              });
            }
          } catch (error) {
            // Skip if can't read series directory
          }
        }
      }
      
      return result;
    }
  } catch (error) {
    console.error('Error listing seasons:', error);
    return [];
  }
}

export async function getSeasonSummary(series: string, season: string): Promise<SeasonSummary | null> {
  const formattedSeries = series.toLowerCase().replace(/\s+/g, '-');
  const formattedSeason = season.toLowerCase().replace(/\s+/g, '-');
  
  // Use blob storage in production, local filesystem in development
  const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (useBlob) {
    console.log('Loading season summary from blob storage');
    
    // Get season data and regenerate summary
    const seasonData = await loadFromBlobStorage(formattedSeries, formattedSeason);
    if (seasonData && seasonData.races && seasonData.races.length > 0) {
      return calculateSeasonSummary(seasonData.races, seasonData.series, seasonData.season);
    }
    return null;
  } else {
    console.log('Loading season summary from local filesystem');
    const summaryFile = path.join(DATA_DIR, formattedSeries, `${formattedSeason}-summary.json`);
    
    try {
      const data = await fs.readFile(summaryFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Summary file doesn't exist, try to regenerate it from season data
      console.log(`Summary file not found, attempting to regenerate: ${summaryFile}`);
      
      const seasonFile = path.join(DATA_DIR, formattedSeries, `${formattedSeason}.json`);
      try {
        const seasonData = await fs.readFile(seasonFile, 'utf-8');
        const data = JSON.parse(seasonData);
        
        if (data.races && data.races.length > 0) {
          // Regenerate summary from race data
          const summary = calculateSeasonSummary(data.races, data.series, data.season);
          
          // Save the regenerated summary
          await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
          console.log(`Successfully regenerated summary file: ${summaryFile}`);
          return summary;
        }
      } catch (error) {
        console.error(`Failed to load season data: ${error}`);
      }
      
      return null;
    }
  }
}

export async function getRaceWinners(series: string, season: string): Promise<RaceWinner[]> {
  const summary = await getSeasonSummary(series, season);
  return summary?.raceWinners || [];
}

export async function getDriverSeasonStats(series: string, season: string, driver?: string): Promise<DriverSeasonStats[]> {
  const summary = await getSeasonSummary(series, season);
  if (!summary) return [];
  
  if (driver) {
    const driverStats = summary.currentStandings.find(stats => 
      stats.driver.toLowerCase() === driver.toLowerCase()
    );
    return driverStats ? [driverStats] : [];
  }
  
  return summary.currentStandings;
}

export async function getLatestRaceWinner(series: string, season: string): Promise<RaceWinner | null> {
  const winners = await getRaceWinners(series, season);
  return winners.length > 0 ? winners[winners.length - 1] : null;
}

export async function getAllAvailableSeasons(): Promise<{ series: string; seasons: string[] }[]> {
  await ensureDataDirectory();
  
  const result: { series: string; seasons: string[] }[] = [];
  
  try {
    const seriesFolders = await fs.readdir(DATA_DIR);
    
    for (const folder of seriesFolders) {
      const seriesPath = path.join(DATA_DIR, folder);
      const stat = await fs.stat(seriesPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(seriesPath);
        const seasons = files
          .filter(file => file.endsWith('.json') && !file.endsWith('-summary.json'))
          .map(file => file.replace('.json', ''))
          .map(season => season.replace(/-/g, ' '));
        
        if (seasons.length > 0) {
          result.push({
            series: folder.replace(/-/g, ' '),
            seasons: seasons.sort()
          });
        }
      }
    }
  } catch (error) {
    console.error('Error reading available seasons:', error);
  }
  
  return result;
}

// Vercel Blob Storage implementation
async function saveToBlobStorage(raceData: RaceData, raceNumberOverride?: number): Promise<void> {
  console.log('=== Saving to Vercel Blob Storage ===');
  console.log('Race data keys:', Object.keys(raceData));
  console.log('Race data metadata:', raceData.metadata);
  console.log('Race data results type:', typeof raceData.results);
  console.log('Race data results isArray:', Array.isArray(raceData.results));
  
  // Check if results exists and is iterable
  if (!raceData.results) {
    console.error('No results property found in race data');
    throw new Error('Race data is missing results property');
  }
  
  if (!Array.isArray(raceData.results)) {
    console.error('Results is not an array:', typeof raceData.results, raceData.results);
    throw new Error('Race data results is not an array');
  }
  
  if (raceData.results.length === 0) {
    console.error('Results array is empty');
    throw new Error('Race data results array is empty');
  }
  
  console.log('Results count:', raceData.results.length);
  console.log('First result sample:', raceData.results[0]);
  
  const series = raceData.metadata.series.toLowerCase().replace(/\s+/g, '-');
  const season = raceData.metadata.season.toLowerCase().replace(/\s+/g, '-');
  
  // Create file path for blob storage
  const fileName = `${series}/${season}.json`;
  console.log('Blob storage filename:', fileName);
  
  try {
    // For now, just create new season data structure
    const raceNumber = raceNumberOverride || 1;
    
    // Create season data in same format as local storage
    const seasonData = {
      series: raceData.metadata.series,
      season: raceData.metadata.season,
      races: [raceData], // Save the entire race data object
      lastUpdated: new Date().toISOString()
    };
    
    // Save to blob storage
    const blob = await put(fileName, JSON.stringify(seasonData, null, 2), {
      access: 'public',
      token: process.env.crl_READ_WRITE_TOKEN,
      allowOverwrite: true
    });
    
    console.log('Successfully saved to blob storage:', blob.url);
    
  } catch (error: any) {
    console.error('Error saving to blob storage:', error);
    throw new Error(`Failed to save race data to blob storage: ${error.message}`);
  }
}

async function ensureDataDirectory(): Promise<void> {
  console.log('=== ensureDataDirectory called ===');
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
    platform: process.platform,
    cwd: process.cwd()
  });
  
  // Force local development when running from Windows and cwd contains OneDrive
  const isWindowsLocal = process.platform === 'win32' && process.cwd().includes('OneDrive');
  const isLocalDev = isWindowsLocal || (!process.env.VERCEL && !process.env.LAMBDA_TASK_ROOT && process.env.NODE_ENV !== 'production');
  
  console.log('Environment detection:', {
    isWindowsLocal,
    isLocalDev
  });
  
  let possibleDataDirs: string[];
  
  if (isLocalDev) {
    // For local development, prioritize local project directory
    const projectDataDir = path.join(process.cwd(), 'data');
    possibleDataDirs = [
      projectDataDir, // Always try project directory first in dev
      path.resolve('./data'), // Relative to current directory
      path.join(__dirname, '../../../data') // Relative to this file
    ];
    console.log('Using LOCAL DEVELOPMENT paths');
  } else {
    // For production/serverless, use fallback paths
    possibleDataDirs = [
      '/tmp/data',
      path.join(process.cwd(), 'data'),
      path.resolve('./data')
    ];
    console.log('Using PRODUCTION/SERVERLESS paths');
  }
  
  console.log('Possible data directories:', possibleDataDirs);
  
  let dataDir: string | null = null;
  
  for (const dir of possibleDataDirs) {
    try {
      console.log(`Trying to create/access: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
      
      // Test if we can write to this directory
      const testFile = path.join(dir, '.test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      console.log(`Successfully verified directory: ${dir}`);
      dataDir = dir;
      break;
    } catch (error) {
      console.log(`Failed to use directory ${dir}:`, error);
      continue;
    }
  }
  
  if (!dataDir) {
    throw new Error('Could not create or access data directory. Tried: ' + possibleDataDirs.join(', '));
  }
  
  // Update the global DATA_DIR
  console.log(`Using data directory: ${dataDir}`);
  (global as any).RUNTIME_DATA_DIR = dataDir;
}