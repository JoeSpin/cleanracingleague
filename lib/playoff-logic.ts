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

// Mock function to identify race winners - this should be enhanced to track actual winners
function getRaceWinners(drivers: Driver[]): string[] {
  // For now, we'll consider any driver with wins as having advanced
  // This should be enhanced to track specific race winners by race number
  return drivers.filter(d => d.wins > 0).map(d => d.name);
}

export function calculatePlayoffStandings(
  drivers: Driver[], 
  raceNumber: number = PLAYOFF_CONFIG.currentRace
): PlayoffDriver[] {
  const currentRound = getCurrentPlayoffRound(raceNumber);
  const roundConfig = PLAYOFF_CONFIG.rounds[currentRound];
  const winners = getRaceWinners(drivers);
  
  // Sort drivers: winners first (by wins desc), then by points desc
  const sortedDrivers = [...drivers].sort((a, b) => {
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