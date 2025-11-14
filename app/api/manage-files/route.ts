import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { list, del } from '@vercel/blob';
import { getSeasonData } from '@/lib/race-data/storage';

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
    // Use blob storage in production, local filesystem in development
    const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (useBlob) {
      console.log('Loading file list from blob storage');
      return await getFilesFromBlob();
    } else {
      console.log('Loading file list from local filesystem');
      return await getFilesFromLocal();
    }
  } catch (error) {
    console.error('Error loading files:', error);
    return NextResponse.json({ 
      files: [], 
      error: 'Failed to load files' 
    }, { status: 500 });
  }
}

async function getFilesFromBlob() {
  try {
    const { blobs } = await list({ 
      token: process.env.crl_READ_WRITE_TOKEN 
    });
    
    console.log('Available blobs:', blobs.map(b => b.pathname));
    
    const files: FileInfo[] = [];
    const seasonGroups = new Map<string, FileInfo>();
    
    for (const blob of blobs) {
      // Parse pathname like "truck/crl-truck-series-season-24.json"
      const parts = blob.pathname.split('/');
      if (parts.length === 2) {
        const series = parts[0];
        const fileName = parts[1];
        
        // Skip summary files
        if (fileName.endsWith('-summary.json')) continue;
        
        if (fileName.endsWith('.json')) {
          // This is a season file, fetch it to get race details
          try {
            const response = await fetch(blob.url);
            if (!response.ok) {
              console.warn(`Failed to fetch blob ${blob.pathname}: ${response.status} ${response.statusText}`);
              continue;
            }
            
            const text = await response.text();
            if (!text || text.includes('Blob not found')) {
              console.warn(`Blob ${blob.pathname} not found or empty`);
              continue;
            }
            
            const seasonData = JSON.parse(text);
            
            if (seasonData.races && Array.isArray(seasonData.races)) {
              const seasonKey = `${series}-${fileName.replace('.json', '')}`;
              
              if (!seasonGroups.has(seasonKey)) {
                seasonGroups.set(seasonKey, {
                  series: series,
                  season: seasonData.season || fileName.replace('.json', ''),
                  races: [],
                  playoffs: []
                });
              }
              
              const fileInfo = seasonGroups.get(seasonKey)!;
              
              // Add races from this season file
              for (const race of seasonData.races) {
                fileInfo.races.push({
                  raceNumber: race.metadata?.raceNumber || 1,
                  track: race.metadata?.track || 'Unknown',
                  date: race.metadata?.raceDate || 'Unknown',
                  filePath: `${blob.pathname}#race${race.metadata?.raceNumber || 1}` // Include race identifier
                });
              }
            }
          } catch (error) {
            console.error(`Error parsing season file ${blob.pathname}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
    
    files.push(...seasonGroups.values());
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error loading files from blob:', error);
    return NextResponse.json({ files: [] });
  }
}

async function getFilesFromLocal() {
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
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    console.log('Delete request:', { filePath, hasToken: !!process.env.crl_READ_WRITE_TOKEN });

    // Use blob storage in production, local filesystem in development
    const useBlob = process.env.VERCEL || process.env.NODE_ENV === 'production';

    if (useBlob) {
      console.log('Deleting from blob storage');
      return await deleteFromBlob(filePath);
    } else {
      console.log('Deleting from local filesystem');  
      return await deleteFromLocal(filePath);
    }
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: `Failed to delete file: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function deleteFromBlob(filePath: string) {
  try {
    console.log('Deleting from blob storage:', filePath);
    
    // Check if this is a race-specific deletion (contains #race)
    if (filePath.includes('#race')) {
      const [seasonPath, raceId] = filePath.split('#');
      const raceNumber = parseInt(raceId.replace('race', ''));
      
      console.log('Race-specific deletion:', { seasonPath, raceNumber });
      
      // Load existing season data
      const parts = seasonPath.split('/');
      const seriesSlug = parts[0];
      const seasonSlug = parts[1].replace('.json', '');
      
      console.log('Loading season data for deletion:', { seriesSlug, seasonSlug });
      
      const seasonData = await getSeasonData(seriesSlug, seasonSlug);
      if (!seasonData || !seasonData.races) {
        return NextResponse.json(
          { error: `Season data not found for ${seriesSlug}/${seasonSlug}` },
          { status: 404 }
        );
      }
      
      console.log('Found season data with', seasonData.races.length, 'races');
      
      // Remove the specific race
      const originalLength = seasonData.races.length;
      seasonData.races = seasonData.races.filter((race: any) => race.metadata?.raceNumber !== raceNumber);
      
      if (seasonData.races.length === originalLength) {
        return NextResponse.json(
          { error: `Race ${raceNumber} not found in season` },
          { status: 404 }
        );
      }
      
      // Update timestamp
      seasonData.lastUpdated = new Date().toISOString();
      
      // Save updated season data back to blob storage
      const { put } = await import('@vercel/blob');
      await put(seasonPath, JSON.stringify(seasonData, null, 2), {
        access: 'public',
        token: process.env.crl_READ_WRITE_TOKEN,
        allowOverwrite: true
      });
      
      return NextResponse.json({ 
        success: true,
        message: `Race ${raceNumber} deleted successfully from cloud storage!`
      });
    } else {
      // Delete entire season file
      const blobPath = filePath.replace(/\\/g, '/');
      
      await del(blobPath, { token: process.env.crl_READ_WRITE_TOKEN });
      
      // Also try to delete summary file
      const summaryPath = blobPath.replace('.json', '-summary.json');
      try {
        await del(summaryPath, { token: process.env.crl_READ_WRITE_TOKEN });
      } catch (summaryError) {
        console.warn('Summary file not found in blob storage:', summaryPath);
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Season file deleted successfully from cloud storage!'
      });
    }
  } catch (error: any) {
    console.error('Blob deletion failed:', error);
    return NextResponse.json(
      { error: `Failed to delete from cloud storage: ${error.message}` },
      { status: 500 }
    );
  }
}

async function deleteFromLocal(filePath: string) {
  try {
    const fullPath = path.join(DATA_DIR, filePath);
    console.log('Trying local deletion:', fullPath);
    
    await fs.access(fullPath);
    
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
      message: 'File deleted successfully from local storage!'
    });
  } catch (error: any) {
    console.error('Local deletion failed:', error);
    return NextResponse.json(
      { error: `File not found: ${filePath}` },
      { status: 404 }
    );
  }
}