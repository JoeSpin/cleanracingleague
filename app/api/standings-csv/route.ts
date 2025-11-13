import { NextRequest, NextResponse } from 'next/server';
import { getSeasonStandings, getSeasonSummary, listAvailableSeasons } from '@/lib/race-data/storage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    const season = searchParams.get('season');
    
    // If no specific series/season requested, list available options
    if (!series || !season) {
      const available = await listAvailableSeasons();
      return NextResponse.json({
        available,
        message: 'Specify ?series=<series>&season=<season> to get standings'
      });
    }
    
    // Get comprehensive season data including total races
    const seasonSummary = await getSeasonSummary(series, season);
    
    if (!seasonSummary || seasonSummary.currentStandings.length === 0) {
      return NextResponse.json({
        standings: [],
        totalRaces: 0,
        completedRaces: 0,
        message: `No data found for ${series} ${season}`
      });
    }
    
    return NextResponse.json({
      series,
      season,
      standings: seasonSummary.currentStandings,
      totalRaces: seasonSummary.totalRaces,
      completedRaces: seasonSummary.completedRaces,
      currentRace: seasonSummary.currentRace,
      isPlayoffSeason: seasonSummary.isPlayoffSeason,
      currentPlayoffRound: seasonSummary.currentPlayoffRound,
      lastUpdated: seasonSummary.lastUpdated
    });
    
  } catch (error) {
    console.error('Error getting standings:', error);
    return NextResponse.json(
      { error: 'Failed to get standings data' },
      { status: 500 }
    );
  }
}