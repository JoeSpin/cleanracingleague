// Playoff configuration for tracking race numbers and playoff rounds
export interface PlayoffConfig {
  currentRace: number;
  totalRaces: number;
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
  currentRace: 9, // Update this as races are completed
  totalRaces: 16,
  rounds: {
    // Regular season: races 1-9, show top 20 with cutoff after 12
    regular: { races: [1, 2, 3, 4, 5, 6, 7, 8, 9], cutoff: 12, displayCount: 20 },
    
    // Round of 12: races 10-11, show top 12 with cutoff after 8
    round1: { races: [10, 11], cutoff: 8, displayCount: 12 },
    
    // Round of 8: races 12-13, show top 12 with cutoff after 4
    round2: { races: [12, 13], cutoff: 4, displayCount: 12 },
    
    // Championship 4: races 14-15, show top 4 with no points
    championship: { races: [14, 15], cutoff: 4, displayCount: 4 },
    
    // Season complete: race 16+, show champion
    complete: { races: [16], cutoff: 1, displayCount: 4 }
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
  if (raceNumber >= 16) return `Season Complete - Congratulations to the Champion!`;
  return `Playoff Standings after Race ${raceNumber} of ${PLAYOFF_CONFIG.totalRaces}`;
}