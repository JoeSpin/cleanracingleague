import { PLAYOFF_CONFIG, getCurrentPlayoffRound } from './playoff-config';

export interface Driver {
  position: number;
  change: string;
  name: string;
  points: number;
  behindLeader: string;
  starts: number;
  wins: number;
  top5: number;
  top10: number;
  laps: number;
  incidents: number;
  profileUrl?: string;
}

export interface PlayoffDriver extends Driver {
  playoffStatus: 'ADV' | 'IN' | 'OUT';
  playoffPoints: string; // +/- points from cutoff or "ADV"
  isAboveCutoff: boolean;
}

// Function to identify drivers who won races in the current playoff round
function getCurrentRoundWinners(drivers: Driver[], raceNumber: number, roundWinners: string[] = []): string[] {
  // roundWinners should be passed from the playoff standings data
  // It contains drivers who won races specifically during this playoff round
  // 
  // IMPORTANT: For accurate playoff advancement, you need to specify which drivers
  // won races during the CURRENT playoff round, not their total season wins.
  // 
  // TODO: Enhance admin interface to allow specifying round winners when uploading playoff standings
  return roundWinners;
}

export function calculatePlayoffStandings(
  drivers: Driver[], 
  raceNumber: number = PLAYOFF_CONFIG.currentRace,
  currentRoundWinners: string[] = []
): PlayoffDriver[] {
  console.log('calculatePlayoffStandings called with:', {
    driverCount: drivers.length,
    raceNumber,
    currentRoundWinners
  });
  
  const currentRound = getCurrentPlayoffRound(raceNumber);
  const roundConfig = PLAYOFF_CONFIG.rounds[currentRound];
  
  // Filter for playoff eligible drivers only
  const eligibleDrivers = getPlayoffEligibleDrivers(drivers, raceNumber);
  
  const winners = getCurrentRoundWinners(eligibleDrivers, raceNumber, currentRoundWinners);
  
  // Sort drivers: winners first (by wins desc), then by points desc
  const sortedDrivers = [...eligibleDrivers].sort((a, b) => {
    const aIsWinner = winners.includes(a.name);
    const bIsWinner = winners.includes(b.name);
    
    if (aIsWinner && !bIsWinner) return -1;
    if (!aIsWinner && bIsWinner) return 1;
    if (aIsWinner && bIsWinner) return b.wins - a.wins; // More wins first
    return b.points - a.points; // Higher points first
  });
  
  // Take only the drivers we need to display for this round
  const displayDrivers = sortedDrivers.slice(0, roundConfig.displayCount);
  
  // Calculate playoff standings
  const playoffDrivers: PlayoffDriver[] = displayDrivers.map((driver, index) => {
    const position = index + 1;
    const isWinner = winners.includes(driver.name);
    const isAboveCutoff = position <= roundConfig.cutoff;
    
    let playoffStatus: 'ADV' | 'IN' | 'OUT';
    let playoffPoints: string;
    
    // Championship round (14-15): no points displayed
    if (currentRound === 'championship') {
      playoffStatus = 'IN';
      playoffPoints = '-';
    } else if (isWinner) {
      playoffStatus = 'ADV';
      playoffPoints = 'ADV';
      console.log(`Driver ${driver.name} marked as ADV (round winner)`);
    } else if (isAboveCutoff) {
      playoffStatus = 'IN';
      // Calculate points above the cutoff line (position after cutoff)
      const cutoffDriver = displayDrivers[roundConfig.cutoff];
      const pointsAboveCutoff = cutoffDriver ? driver.points - cutoffDriver.points : 0;
      playoffPoints = pointsAboveCutoff > 0 ? `+${pointsAboveCutoff}` : '0';
    } else {
      playoffStatus = 'OUT';
      // Calculate points behind the cutoff line
      const cutoffDriver = displayDrivers[roundConfig.cutoff - 1]; // -1 because cutoff is 1-indexed
      const pointsBehindCutoff = cutoffDriver ? cutoffDriver.points - driver.points : 0;
      playoffPoints = `-${pointsBehindCutoff}`;
    }
    
    return {
      ...driver,
      position,
      playoffStatus,
      playoffPoints,
      isAboveCutoff: isAboveCutoff || isWinner
    };
  });
  
  return playoffDrivers;
}

// Filter drivers for playoff eligibility
function getPlayoffEligibleDrivers(drivers: Driver[], raceNumber: number): Driver[] {
  // First, sort by points to determine top 20 in regular standings
  const sortedByPoints = [...drivers].sort((a, b) => b.points - a.points);
  
  return sortedByPoints
    .slice(0, 20) // Only consider top 20 in points
    .filter(driver => {
      // Check if driver has missed more than 3 races
      const missedRaces = raceNumber - driver.starts;
      const hasAttendanceWaiver = missedRaces <= 3;
      
      console.log(`Driver ${driver.name}: ${driver.starts} starts out of ${raceNumber} races, missed ${missedRaces}, eligible: ${hasAttendanceWaiver}`);
      
      return hasAttendanceWaiver;
    });
}

export function getPlayoffRoundInfo(raceNumber: number = PLAYOFF_CONFIG.currentRace) {
  const currentRound = getCurrentPlayoffRound(raceNumber);
  const roundConfig = PLAYOFF_CONFIG.rounds[currentRound];
  
  return {
    round: currentRound,
    cutoff: roundConfig.cutoff,
    displayCount: roundConfig.displayCount,
    races: roundConfig.races
  };
}