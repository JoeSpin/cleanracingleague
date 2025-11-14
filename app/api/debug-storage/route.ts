import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || '';
    
    console.log('Debug storage API called with filter:', filter);
    
    // List all blobs in storage
    const { blobs } = await list({ 
      token: process.env.crl_READ_WRITE_TOKEN 
    });
    
    console.log('Total blobs found:', blobs.length);
    
    // Filter blobs if requested
    const filteredBlobs = filter 
      ? blobs.filter(blob => blob.pathname.includes(filter))
      : blobs;
    
    // Get detailed info for each blob
    const blobDetails = filteredBlobs.map(blob => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      downloadUrl: blob.downloadUrl
    }));
    
    return NextResponse.json({
      totalBlobs: blobs.length,
      filteredBlobs: blobDetails.length,
      filter: filter || 'none',
      blobs: blobDetails,
      // Show first few blob contents for truck series
      sampleContent: filter === 'truck' && blobDetails.length > 0 
        ? await getSampleContent(blobDetails[0].downloadUrl)
        : null
    });
    
  } catch (error) {
    console.error('Error debugging storage:', error);
    return NextResponse.json(
      { error: 'Failed to debug storage', details: error },
      { status: 500 }
    );
  }
}

async function getSampleContent(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const content = await response.json();
    return {
      hasRaces: !!content.races,
      raceCount: content.races?.length || 0,
      series: content.series,
      season: content.season,
      firstRace: content.races?.[0]?.metadata?.track || 'none',
      hasPlayoffData: !!(content as any).playoffStandings
    };
  } catch (error) {
    return { error: 'Failed to parse content' };
  }
}