import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://simracerhub.com/api/league/3570', {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();

    const currentSeason = data.seasons?.[0];
    if (!currentSeason?.races) {
      return NextResponse.json({ error: 'No races found' }, { status: 404 });
    }

    const latestRace = currentSeason.races
      .filter((race: any) => race.finished)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestRace?.results?.[0]) {
      return NextResponse.json({ error: 'No race results found' }, { status: 404 });
    }

    const winner = latestRace.results[0];
    return NextResponse.json({
      track: latestRace.track,
      winner: winner.driver,
      date: latestRace.date
    });

  } catch (error) {
    console.error('Race results API error:', error);
    return NextResponse.json({ error: 'Failed to fetch race results' }, { status: 500 });
  }
}
