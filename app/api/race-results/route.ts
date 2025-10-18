import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try Elite series first - series_id=10554
    const eliteUrl = 'https://www.simracerhub.com/scoring/season_race.php?series_id=10554';
    const response = await fetch(eliteUrl, {
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
      track: 'Texas Motor Speedway',
      winner: 'Test Driver',
      date: new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Race results API error:', error);
    return NextResponse.json({ error: 'Failed to fetch race results' }, { status: 500 });
  }
}
