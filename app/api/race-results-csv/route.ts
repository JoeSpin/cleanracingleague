import { NextRequest, NextResponse } from 'next/server';
import { getLatestRaceResult, getAllRaces } from '@/lib/race-data/storage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    const season = searchParams.get('season');
    const all = searchParams.get('all') === 'true';
    
    if (!series || !season) {
      return NextResponse.json({
        error: 'Missing required parameters: series and season'
      }, { status: 400 });
    }
    
    if (all) {
      // Return all races for the season
      const races = await getAllRaces(series, season);
      return NextResponse.json({
        series,
        season,
        races,
        totalRaces: races.length
      });
    } else {
      // Return just the latest race
      const latestRace = await getLatestRaceResult(series, season);
      
      if (!latestRace) {
        return NextResponse.json({
          series,
          season,
          race: null,
          message: 'No races found for this series/season'
        });
      }
      
      return NextResponse.json({
        series,
        season,
        race: {
          metadata: latestRace.metadata,
          winner: latestRace.results[0],
          totalParticipants: latestRace.results.length,
          topFive: latestRace.results.slice(0, 5)
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting race results:', error);
    return NextResponse.json(
      { error: 'Failed to get race results' },
      { status: 500 }
    );
  }
}