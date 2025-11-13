// Playoff configuration for tracking race numbers and playoff rounds
export interface PlayoffConfig {
  currentRace: number;
  totalRaces: number;
  bonusPoints: {
    winPoints: number; // Points added for each win
    stageWinPoints: number; // Points added for each stage win
  };
  rounds: {
    regular: { races: number[], cutoff: number, displayCount: number };
    round1: { races: number[], cutoff: number, displayCount: number };
    round2: { races: number[], cutoff: number, displayCount: number };
    championship: { races: number[], cutoff: number, displayCount: number };
    complete: { races: number[], cutoff: number, displayCount: number };
  };
}

// Current season configuration - update this manually for now
export const PLAYOFF_CONFIG: PlayoffConfig = {
  currentRace: 10, // Update this as races are completed
  totalRaces: 15,
  bonusPoints: {
    winPoints: 5, // 5 playoff points per win
    stageWinPoints: 1, // 1 playoff point per stage win
  },
  rounds: {
    // Regular season: races 1-10, show top 20 with cutoff after 10 races completed
    regular: { races: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], cutoff: 12, displayCount: 20 },
    
    // Round of 12: races 11-12, show top 12 with cutoff after 8
    round1: { races: [11, 12], cutoff: 8, displayCount: 12 },
    
    // Round of 8: races 13-14, show top 8 with cutoff after 4
    round2: { races: [13, 14], cutoff: 4, displayCount: 8 },
    
    // Championship 4: race 15 only, show top 4
    championship: { races: [15], cutoff: 4, displayCount: 4 },
    
    // Season complete: after race 15, show champion
    complete: { races: [15], cutoff: 1, displayCount: 4 }
  }
};

export function getCurrentPlayoffRound(raceNumber: number): keyof PlayoffConfig['rounds'] {
  const { rounds } = PLAYOFF_CONFIG;
  
  if (rounds.regular.races.includes(raceNumber)) return 'regular';
  if (rounds.round1.races.includes(raceNumber)) return 'round1';
  if (rounds.round2.races.includes(raceNumber)) return 'round2';
  if (rounds.championship.races.includes(raceNumber)) return 'championship';
  return 'complete';
}

export function getPlayoffTitle(raceNumber: number): string {
  if (raceNumber >= 15) return `Season Complete - Congratulations to the Champion!`;
  return `Playoff Standings after Race ${raceNumber} of ${PLAYOFF_CONFIG.totalRaces}`;
}

export function getRaceNumberFromPlayoffRound(playoffRound: string): number {
  switch (playoffRound) {
    case 'Round of 12':
      return 11; // First race of Round of 12
    case 'Round of 8':
      return 13; // First race of Round of 8
    case 'Championship 4':
      return 15; // Championship race
    default:
      return PLAYOFF_CONFIG.currentRace; // Default to current race
  }
}