import { NextRequest, NextResponse } from 'next/server';
import { getSeasonStandings, getSeasonSummary, listAvailableSeasons } from '@/lib/race-data/storage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    const season = searchParams.get('season');
    
    console.log('Standings API called:', { series, season });
    
    // If no specific series/season requested, list available options
    if (!series || !season) {
      const available = await listAvailableSeasons();
      return NextResponse.json({
        available,
        message: 'Specify ?series=<series>&season=<season> to get standings'
      });
    }
    
    // Get comprehensive season data including total races
    console.log('Calling getSeasonSummary...');
    const seasonSummary = await getSeasonSummary(series, season);
    console.log('getSeasonSummary returned:', {
      hasData: !!seasonSummary,
      standingsCount: seasonSummary?.currentStandings?.length || 0,
      totalRaces: seasonSummary?.totalRaces || 0,
      completedRaces: seasonSummary?.completedRaces || 0
    });
    
    if (!seasonSummary || seasonSummary.currentStandings.length === 0) {
      console.log('No season data found or empty standings');
      return NextResponse.json({
        standings: [],
        totalRaces: 0,
        completedRaces: 0,
        error: `No race data found for ${series} ${season}. Please upload race CSV files first.`,
        message: `No data found for ${series} ${season}`
      });
    }
    
    console.log('Returning standings data with', seasonSummary.currentStandings.length, 'drivers');
    return NextResponse.json({
      series,
      season,
      standings: seasonSummary.currentStandings,
      totalRaces: seasonSummary.totalRaces,
      completedRaces: seasonSummary.completedRaces,
      currentRace: seasonSummary.currentRace,
      isPlayoffSeason: seasonSummary.isPlayoffSeason,
      currentPlayoffRound: seasonSummary.currentPlayoffRound,
      lastUpdated: seasonSummary.lastUpdated,
      playoffMetadata: seasonSummary.playoffMetadata || null
    });
    
  } catch (error) {
    console.error('Error getting standings:', error);
    return NextResponse.json(
      { error: 'Failed to get standings data' },
      { status: 500 }
    );
  }
}