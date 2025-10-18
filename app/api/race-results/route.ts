import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get('league') || 'elite';
    
    // Map leagues to series IDs based on the standings API
    const seriesIds: Record<string, string> = {
      'elite': '10554',
      'trucks': '13239', 
      'arca': '12526'
    };
    
    const seriesId = seriesIds[league] || seriesIds['elite'];
    
    // Try to fetch from SimRacerHub
    const url = `https://www.simracerhub.com/scoring/season_race.php?series_id=${seriesId}`;
    const response = await fetch(url, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const html = await response.text();
    
    // Parse HTML to find the latest race result
    // Look for the most recent race with results
    const racePattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/gi;
    const matches = Array.from(html.matchAll(racePattern));
    
    if (matches.length === 0) {
      return NextResponse.json({ error: 'No race results found' }, { status: 404 });
    }

    // For now, return a mock result to test the structure
    return NextResponse.json({
      result: {
        track: `${league.toUpperCase()} - Texas Motor Speedway`,
        winner: 'Test Driver',
        date: new Date().toISOString().split('T')[0]
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Race results API error:', error);
    return NextResponse.json({ error: 'Failed to fetch race results' }, { status: 500 });
  }
}
