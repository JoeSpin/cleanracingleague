const fs = require('fs');

// Import the parser (simulate the function)
function parsePlayoffStandingsCSV(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Parse metadata from first lines
  const metadata = {};
  let dataStartIndex = 0;
  
  console.log('=== Parsing Metadata ===');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the results header
    if (line.includes('Finish') && line.includes('Driver')) {
      console.log(`Found header at line ${i + 1}, stopping metadata parsing`);
      dataStartIndex = i + 1;
      break;
    }
    
    // Parse metadata lines
    const metadataMatch = line.match(/^([^,]+),(.+)$/);
    if (metadataMatch) {
      const [, key, value] = metadataMatch;
      const cleanKey = key.replace(/"/g, '').trim();
      const cleanValue = value.replace(/"/g, '').trim();
      
      console.log(`Line ${i + 1}: "${line}"`);
      console.log(`  Key: "${cleanKey}" | Value: "${cleanValue}"`);
      
      switch (cleanKey.toLowerCase()) {
        case 'league':
          metadata.league = cleanValue;
          console.log(`  ✓ Set league: "${cleanValue}"`);
          break;
        case 'series':
          metadata.series = cleanValue;
          console.log(`  ✓ Set series: "${cleanValue}"`);
          break;
        case 'season':
          metadata.season = cleanValue;
          console.log(`  ✓ Set season: "${cleanValue}"`);
          break;
        case 'race date':
          metadata.updateDate = cleanValue;
          console.log(`  ✓ Set updateDate: "${cleanValue}"`);
          if (!metadata.playoffRound) {
            metadata.playoffRound = "Round of 12";
            console.log(`  ✓ Set default playoffRound: "Round of 12"`);
          }
          break;
        default:
          console.log(`  - Skipped key: "${cleanKey}"`);
      }
    } else {
      console.log(`Line ${i + 1}: No metadata match for "${line}"`);
    }
  }
  
  console.log('\n=== Final Metadata ===');
  console.log(JSON.stringify(metadata, null, 2));
  
  return {
    metadata,
    standings: [] // Just for testing
  };
}

// Test with the playoff CSV
const csvContent = fs.readFileSync('c:\\Users\\JoeSp\\Downloads\\results_99475 (1).csv', 'utf-8');
const result = parsePlayoffStandingsCSV(csvContent);

console.log('\n=== Validation ===');
console.log(`Has series: ${!!result.metadata.series}`);
console.log(`Has season: ${!!result.metadata.season}`);
console.log(`Series value: "${result.metadata.series}"`);
console.log(`Season value: "${result.metadata.season}"`);