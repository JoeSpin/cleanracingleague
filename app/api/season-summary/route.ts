import { NextRequest, NextResponse } from 'next/server';
import { getSeasonSummary, getAllAvailableSeasons } from '@/lib/race-data/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    const season = searchParams.get('season');
    
    // If no specific series/season requested, list available options
    if (!series || !season) {
      const available = await getAllAvailableSeasons();
      return NextResponse.json({
        available,
        message: 'Specify ?series=<series>&season=<season> to get season summary'
      });
    }
    
    // Get comprehensive season summary
    const summary = await getSeasonSummary(series, season);
    
    if (!summary) {
      return NextResponse.json({
        series,
        season,
        summary: null,
        message: `No data found for ${series} ${season}`
      });
    }
    
    return NextResponse.json({
      series,
      season,
      summary,
      message: `Season summary for ${series} ${season}`
    });
    
  } catch (error) {
    console.error('Error fetching season summary:', error);
    return NextResponse.json({
      error: 'Failed to fetch season summary'
    }, { status: 500 });
  }
}