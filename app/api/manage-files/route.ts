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
              // Handle playoff standings file
              const season = data.metadata?.season || 'Unknown Season';
              const series = data.metadata?.series || seriesDir.name;
              
              let fileInfo = seasonGroups.get(season);
              if (!fileInfo) {
                fileInfo = {
                  series: series,
                  season: season,
                  races: [],
                  playoffs: []
                };
                seasonGroups.set(season, fileInfo);
              }
              
              fileInfo.playoffs.push({
                round: data.metadata?.playoffRound || `Round ${data.metadata?.round || '?'}`,
                updateDate: data.metadata?.updateDate || new Date().toISOString().split('T')[0],
                driversCount: data.standings?.length || 0,
                filePath: path.relative(DATA_DIR, filePath).replace(/\\/g, '/')
              });
            } else if (!fileName.includes('-summary')) {
              // Handle regular race data file
              const season = data.metadata?.season || data.season || 'Unknown Season';
              const series = data.metadata?.series || data.series || seriesDir.name;
              
              let fileInfo = seasonGroups.get(season);
              if (!fileInfo) {
                fileInfo = {
                  series: series,
                  season: season,
                  races: [],
                  playoffs: []
                };
                seasonGroups.set(season, fileInfo);
              }
              
              // Add races from this file
              if (data.races && Array.isArray(data.races)) {
                data.races.forEach((race: any, index: number) => {
                  fileInfo!.races.push({
                    raceNumber: race.metadata?.raceNumber || index + 1,
                    track: race.metadata?.track || 'Unknown Track',
                    date: race.metadata?.raceDate || race.metadata?.date || 'Unknown Date',
                    filePath: path.relative(DATA_DIR, filePath).replace(/\\/g, '/')
                  });
                });
              }
            }
          } catch (parseError) {
            console.warn(`Failed to parse file ${fileName}:`, parseError);
          }
        }
      }
      
      // Add all season groups to files array
      for (const fileInfo of seasonGroups.values()) {
        // Sort races by race number
        fileInfo.races.sort((a, b) => a.raceNumber - b.raceNumber);
        files.push(fileInfo);
      }
    }
    
    // Sort files by series and season
    files.sort((a, b) => {
      if (a.series !== b.series) {
        return a.series.localeCompare(b.series);
      }
      return a.season.localeCompare(b.season);
    });
    
    const response = NextResponse.json({ files });
    
    // Add cache-busting headers
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
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    if (isProduction && process.env.crl_READ_WRITE_TOKEN) {
      // Delete from Vercel Blob in production
      try {
        await del(filePath);
        
        // Also try to delete summary file
        const summaryPath = filePath.replace('.json', '-summary.json');
        try {
          await del(summaryPath);
        } catch {
          // Summary might not exist
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'File deleted successfully! Changes are live immediately.'
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to delete file from storage' },
          { status: 500 }
        );
      }
    } else {
      // Delete from local filesystem in development
      const fullPath = path.join(DATA_DIR, filePath);
      
      try {
        await fs.access(fullPath);
      } catch {
        return NextResponse.json(
          { error: `File not found: ${filePath}` },
          { status: 404 }
        );
      }
      
      const relativePath = path.relative(DATA_DIR, fullPath);
      if (relativePath.startsWith('..')) {
        return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 400 }
        );
      }
      
      await fs.unlink(fullPath);
      
      // Also delete summary file if it exists
      const summaryPath = fullPath.replace('.json', '-summary.json');
      try {
        await fs.access(summaryPath);
        await fs.unlink(summaryPath);
      } catch {
        // Summary file doesn't exist, that's okay
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'File deleted successfully!'
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete file: ${errorMessage}` },
      { status: 500 }
    );
  }
}