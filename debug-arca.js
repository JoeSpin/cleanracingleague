const { list } = require('@vercel/blob');

async function debugStorage() {
  try {
    console.log('Checking blob storage contents...');
    
    const { blobs } = await list({
      token: process.env.crl_READ_WRITE_TOKEN
    });
    
    console.log(`Found ${blobs.length} total files in blob storage:`);
    
    blobs.forEach((blob, index) => {
      console.log(`${index + 1}. ${blob.pathname} (${blob.size} bytes, uploaded: ${blob.uploadedAt})`);
    });
    
    // Look specifically for ARCA files
    const arcaFiles = blobs.filter(blob => blob.pathname.includes('arca'));
    console.log(`\nFound ${arcaFiles.length} ARCA files:`);
    arcaFiles.forEach(file => {
      console.log(`  - ${file.pathname}`);
    });
    
    // Look specifically for truck files
    const truckFiles = blobs.filter(blob => blob.pathname.includes('truck'));
    console.log(`\nFound ${truckFiles.length} truck files:`);
    truckFiles.forEach(file => {
      console.log(`  - ${file.pathname}`);
    });
    
    // Try to load ARCA data specifically
    const arcaSeasonFile = blobs.find(blob => 
      blob.pathname === 'arca/crl-arca-season-2.json'
    );
    
    if (arcaSeasonFile) {
      console.log('\nFound ARCA season file! Checking contents...');
      const response = await fetch(arcaSeasonFile.url);
      if (response.ok) {
        const data = await response.json();
        console.log('ARCA data summary:', {
          series: data.series,
          season: data.season,
          raceCount: data.races?.length || 0,
          firstRaceTrack: data.races?.[0]?.metadata?.track || 'none',
          hasPlayoffData: !!(data.playoffStandings)
        });
      } else {
        console.log('Failed to fetch ARCA data:', response.status);
      }
    } else {
      console.log('\nNo ARCA season file found at: arca/crl-arca-season-2.json');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugStorage().catch(console.error);