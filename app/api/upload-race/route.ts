import { NextRequest, NextResponse } from 'next/server';
import { parseRaceCSV, parsePlayoffStandingsCSV, isPlayoffStandingsCSV } from '@/lib/race-data/csv-parser';
import { saveRaceData, savePlayoffStandingsData } from '@/lib/race-data/storage';

export async function POST(request: NextRequest) {
  try {
    // Check if request has file upload
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const roundWinnersStr = formData.get('roundWinners') as string;
    const raceNumberStr = formData.get('raceNumber') as string;
    const playoffRoundStr = formData.get('playoffRound') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Read file content
    const csvContent = await file.text();
    
    // Parse additional parameters
    const roundWinners = roundWinnersStr 
      ? roundWinnersStr.split(',').map(name => name.trim()).filter(name => name)
      : [];
    
    const raceNumber = raceNumberStr ? parseInt(raceNumberStr) : undefined;
    
    // Check if this is a playoff standings update or regular race data
    if (isPlayoffStandingsCSV(csvContent)) {
      // Handle playoff standings upload
      const playoffData = parsePlayoffStandingsCSV(csvContent);
      
      // Add round winners to metadata if provided
      if (roundWinners.length > 0) {
        playoffData.metadata.roundWinners = roundWinners;
      }
      
      // Override playoff round if specified
      if (playoffRoundStr) {
        playoffData.metadata.playoffRound = playoffRoundStr;
      }
      
      console.log('Parsed playoff data:', {
        metadata: playoffData.metadata,
        standingsCount: playoffData.standings.length
      });
      
      // Validate required data
      if (!playoffData.metadata.series || !playoffData.metadata.season) {
        console.log('Missing metadata:', {
          series: playoffData.metadata.series,
          season: playoffData.metadata.season,
          fullMetadata: playoffData.metadata
        });
        return NextResponse.json(
          { error: 'Invalid playoff CSV format: missing required metadata' },
          { status: 400 }
        );
      }
      
      if (playoffData.standings.length === 0) {
        return NextResponse.json(
          { error: 'Invalid playoff CSV format: no standings found' },
          { status: 400 }
        );
      }
      
      // Save playoff standings data
      await savePlayoffStandingsData(playoffData);
      
      return NextResponse.json({
        success: true,
        type: 'playoff_standings',
        playoff: {
          series: playoffData.metadata.series,
          season: playoffData.metadata.season,
          round: playoffData.metadata.playoffRound,
          updateDate: playoffData.metadata.updateDate,
          driversCount: playoffData.standings.length,
          leader: playoffData.standings[0]?.driver || 'Unknown'
        }
      });
    } else {
      // Handle regular race data upload
      const raceData = parseRaceCSV(csvContent);
      
      // Override race number if specified
      if (raceNumber) {
        raceData.metadata.raceNumber = raceNumber;
      }
      
      // Validate required data
      if (!raceData.metadata.series || !raceData.metadata.season || !raceData.metadata.track) {
        return NextResponse.json(
          { error: 'Invalid CSV format: missing required metadata' },
          { status: 400 }
        );
      }
      
      if (raceData.results.length === 0) {
        return NextResponse.json(
          { error: 'Invalid CSV format: no race results found' },
          { status: 400 }
        );
      }
      
      // Save race data with optional race number override
      await saveRaceData(raceData, raceNumber);
      
      return NextResponse.json({
        success: true,
        type: 'race_results',
        race: {
          series: raceData.metadata.series,
          season: raceData.metadata.season,
          track: raceData.metadata.track,
          date: raceData.metadata.raceDate,
          raceNumber: raceData.metadata.raceNumber,
          participants: raceData.results.length,
          winner: raceData.results[0]?.driver || 'Unknown',
          isReplacement: !!raceNumber // Indicate if this was a replacement upload
        }
      });
    }
    
  } catch (error) {
    console.error('Error uploading race data:', error);
    return NextResponse.json(
      { error: 'Failed to process race data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Race data upload endpoint. Use POST with a CSV file.'
  });
}