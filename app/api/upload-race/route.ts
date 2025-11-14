import { NextRequest, NextResponse } from 'next/server';
import { parseRaceCSV, parsePlayoffStandingsCSV, isPlayoffStandingsCSV } from '@/lib/race-data/csv-parser';
import { saveRaceData, savePlayoffStandingsData } from '@/lib/race-data/storage';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload Race API Called ===');
    
    // Check if request has file upload
    const formData = await request.formData();
    console.log('FormData keys:', Array.from(formData.keys()));
    
    const file = formData.get('file') as File;
    const roundWinnersStr = formData.get('roundWinners') as string;
    const raceNumberStr = formData.get('raceNumber') as string;
    const playoffRoundStr = formData.get('playoffRound') as string;
    
    if (!file) {
      console.error('No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    console.log('File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Read file content
    const csvContent = await file.text();
    console.log('CSV content length:', csvContent.length);
    console.log('CSV preview (first 200 chars):', csvContent.substring(0, 200));
    
    // Parse additional parameters
    const roundWinners = roundWinnersStr 
      ? roundWinnersStr.split(',').map(name => name.trim()).filter(name => name)
      : [];
    
    const raceNumber = raceNumberStr ? parseInt(raceNumberStr) : undefined;
    
    console.log('Parameters:', { roundWinners, raceNumber, playoffRoundStr });
    
    // Check if this is a playoff standings update or regular race data
    if (isPlayoffStandingsCSV(csvContent)) {
      console.log('Processing as playoff standings...');
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
      console.log('Processing as regular race data...');
      // Handle regular race data upload
      let raceData;
      try {
        raceData = parseRaceCSV(csvContent);
        console.log('Parsed race data:', {
          series: raceData.metadata.series,
          season: raceData.metadata.season,
          track: raceData.metadata.track,
          resultsCount: raceData.results.length
        });
      } catch (parseError) {
        console.error('CSV parsing failed:', parseError);
        return NextResponse.json(
          { error: `Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}` },
          { status: 400 }
        );
      }
      
      // Override race number if specified
      if (raceNumber) {
        raceData.metadata.raceNumber = raceNumber;
      }
      
      // Validate required data
      if (!raceData.metadata.series || !raceData.metadata.season || !raceData.metadata.track) {
        console.error('Missing required metadata:', {
          series: raceData.metadata.series,
          season: raceData.metadata.season,
          track: raceData.metadata.track
        });
        return NextResponse.json(
          { error: 'Invalid CSV format: missing required metadata (series, season, or track)' },
          { status: 400 }
        );
      }
      
      if (raceData.results.length === 0) {
        console.error('No race results found in CSV');
        return NextResponse.json(
          { error: 'Invalid CSV format: no race results found' },
          { status: 400 }
        );
      }
      
      console.log('Saving race data...');
      // Save race data with optional race number override
      try {
        await saveRaceData(raceData, raceNumber);
        console.log('Race data saved successfully');
      } catch (saveError) {
        console.error('Failed to save race data:', saveError);
        return NextResponse.json(
          { error: `Failed to save race data: ${saveError instanceof Error ? saveError.message : 'Unknown save error'}` },
          { status: 500 }
        );
      }
      
      // TODO: Re-enable blob storage backup once upload is working
      /*
      // Also backup to Vercel Blob in production 
      if (process.env.NODE_ENV === 'production' && process.env.crl_read_WRITE_TOKEN) {
        try {
          const seriesFolder = raceData.metadata.series.toLowerCase().replace(/\s+/g, '-');
          const seasonKey = raceData.metadata.season.toLowerCase().replace(/\s+/g, '-');
          const blobFileName = `${seriesFolder}/${seasonKey}.json`;
          
          await put(blobFileName, JSON.stringify(raceData, null, 2), {
            access: 'public',
            contentType: 'application/json'
          });
        } catch (blobError) {
          console.warn('Blob storage failed, but main storage succeeded:', blobError);
        }
      }
      */
      
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
    console.error('=== Upload API Error ===');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error message:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process race data',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Race data upload endpoint. Use POST with a CSV file.'
  });
}