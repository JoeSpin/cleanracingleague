import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { list, del } from '@vercel/blob';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');

interface FileInfo {
  series: string;
  season: string;
  races: Array<{
    raceNumber: number;
    track: string;
    date: string;
    filePath: string;
  }>;
  playoffs: Array<{
    round: string;
    updateDate: string;
    driversCount: number;
    filePath: string;
  }>;
}

export async function GET() {
  try {
    const files: FileInfo[] = [];
    
    // Check if data directory exists
    try {
      await fs.access(DATA_DIR);
    } catch {
      return NextResponse.json({ files: [] });
    }
    
    // Read all series directories
    const seriesDirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
    
    for (const seriesDir of seriesDirs) {
      if (!seriesDir.isDirectory()) continue;
      
      const seriesPath = path.join(DATA_DIR, seriesDir.name);
      const seriesFiles = await fs.readdir(seriesPath);
      
      // Group files by season
      const seasonGroups = new Map<string, FileInfo>();
      
      for (const fileName of seriesFiles) {
        const filePath = path.join(seriesPath, fileName);
        
        if (fileName.endsWith('.json')) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Check if this is a playoff file
            if (fileName.includes('-playoff-')) {
              // Extract season from filename (e.g., crl-truck-series-season-24-playoff-123.json)
              const seasonMatch = fileName.match(/^(.+?)-playoff-/);
              if (seasonMatch) {
                const season = seasonMatch[1];
                
                if (!seasonGroups.has(season)) {
                  seasonGroups.set(season, {
                    series: seriesDir.name,
                    season: season,
                    races: [],
                    playoffs: []
                  });
                }
                
                const fileInfo = seasonGroups.get(season)!;
                fileInfo.playoffs.push({
                  round: data.metadata?.playoffRound || 'Unknown Round',
                  updateDate: data.metadata?.updateDate || 'Unknown Date',
                  driversCount: data.standings?.length || 0,
                  filePath: path.relative(DATA_DIR, filePath)
                });
              }
            } else if (fileName.includes('-summary.json')) {
              // Skip summary files for now
              continue;
            } else {
              // Regular season file
              const season = fileName.replace('.json', '');
              
              if (!seasonGroups.has(season)) {
                seasonGroups.set(season, {
                  series: seriesDir.name,
                  season: season,
                  races: [],
                  playoffs: []
                });
              }
              
              const fileInfo = seasonGroups.get(season)!;
              
              // Add races from this season file
              if (data.races && Array.isArray(data.races)) {
                for (const [index, race] of data.races.entries()) {
                  fileInfo.races.push({
                    raceNumber: race.metadata?.raceNumber || index + 1,
                    track: race.metadata?.track || 'Unknown Track',
                    date: race.metadata?.raceDate || 'Unknown Date',
                    filePath: path.relative(DATA_DIR, filePath) + `#race-${index}`
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to parse file ${fileName}:`, error);
          }
        }
      }
      
      files.push(...seasonGroups.values());
    }
    
    // Sort files by series and season
    files.sort((a, b) => {
      if (a.series !== b.series) return a.series.localeCompare(b.series);
      return a.season.localeCompare(b.season);
    });
    
    // Create response with cache-busting headers
    const response = NextResponse.json({ files });
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error loading files:', error);
    return NextResponse.json(
      { error: 'Failed to load files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Check if we're in a read-only environment (like Vercel production)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (isProduction) {
    return NextResponse.json(
      { error: 'File deletion is not available in production environment due to read-only file system. Please redeploy with updated files instead.' },
      { status: 403 }
    );
  }

  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // Handle race deletion (format: path#race-index)
    if (filePath.includes('#race-')) {
      const [jsonPath, raceId] = filePath.split('#');
      const raceIndex = parseInt(raceId.replace('race-', ''));
      
      const fullPath = path.join(DATA_DIR, jsonPath);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return NextResponse.json(
          { error: `File not found: ${jsonPath}` },
          { status: 404 }
        );
      }
      
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.races && data.races[raceIndex]) {
        // Remove the specific race
        data.races.splice(raceIndex, 1);
        
        // Re-number races
        data.races.forEach((race: any, index: number) => {
          if (race.metadata) {
            race.metadata.raceNumber = index + 1;
          }
        });
        
        await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
        
        // Note: Summary file may need manual regeneration after race deletion
      } else {
        return NextResponse.json(
          { error: `Race ${raceIndex + 1} not found in file` },
          { status: 404 }
        );
      }
    } else {
      // Delete entire file
      const fullPath = path.join(DATA_DIR, filePath);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return NextResponse.json(
          { error: `File not found: ${filePath}` },
          { status: 404 }
        );
      }
      
      // Ensure we're only deleting files within the data directory
      const relativePath = path.relative(DATA_DIR, fullPath);
      if (relativePath.startsWith('..')) {
        return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 400 }
        );
      }
      
      await fs.unlink(fullPath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete file: ${errorMessage}` },
      { status: 500 }
    );
  }
}