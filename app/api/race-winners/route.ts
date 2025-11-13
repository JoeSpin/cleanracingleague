import { NextRequest, NextResponse } from 'next/server';
import { getRaceWinners, getLatestRaceWinner, getAllAvailableSeasons } from '@/lib/race-data/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    const season = searchParams.get('season');
    const latest = searchParams.get('latest') === 'true';
    
    // If no specific series/season requested, list available options
    if (!series || !season) {
      const available = await getAllAvailableSeasons();
      return NextResponse.json({
        available,
        message: 'Specify ?series=<series>&season=<season> to get race winners'
      });
    }
    
    if (latest) {
      // Return just the latest race winner
      const latestWinner = await getLatestRaceWinner(series, season);
      
      if (!latestWinner) {
        return NextResponse.json({
          series,
          season,
          winner: null,
          message: 'No race winners found for this series/season'
        });
      }
      
      return NextResponse.json({
        series,
        season,
        latestWinner,
        message: `Latest race winner from ${latestWinner.track}`
      });
    } else {
      // Return all race winners for the season
      const winners = await getRaceWinners(series, season);
      
      return NextResponse.json({
        series,
        season,
        raceWinners: winners,
        totalRaces: winners.length,
        message: `Race winners for ${series} ${season}`
      });
    }
  } catch (error) {
    console.error('Error fetching race winners:', error);
    return NextResponse.json({
      error: 'Failed to fetch race winners'
    }, { status: 500 });
  }
}