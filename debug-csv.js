const fs = require('fs');
const path = require('path');

// Read your CSV file
const csvContent = fs.readFileSync('c:\\Users\\JoeSp\\Downloads\\results_99475.csv', 'utf8');

console.log('=== CSV ANALYSIS ===');

const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
console.log('Total lines:', lines.length);

console.log('\nFirst 12 lines:');
lines.slice(0, 12).forEach((line, i) => console.log(`${i}: ${line}`));

console.log('\n=== RACE METADATA CHECK ===');
let hasRaceMetadata = false;
const raceMetadataFound = [];

for (let i = 0; i < Math.min(15, lines.length); i++) {
  const line = lines[i].toLowerCase();
  if (line.includes('race laps') || line.includes('race duration') || 
      line.includes('cautions') || line.includes('caution laps') ||
      line.includes('lead changes') || line.includes('leaders')) {
    console.log(`Line ${i}: ${lines[i]}`);
    raceMetadataFound.push(lines[i]);
    hasRaceMetadata = true;
  }
}

console.log('Has race metadata:', hasRaceMetadata);
console.log('Race metadata found:', raceMetadataFound.length, 'items');

console.log('\n=== PLAYOFF DETECTION TEST ===');
let hasEmptyTrack = false;
let hasZeroedRaceData = false;

for (let i = 0; i < Math.min(15, lines.length); i++) {
  const line = lines[i];
  
  if (line.match(/^Track,\s*$/)) {
    console.log('Found empty track:', line);
    hasEmptyTrack = true;
  }
  
  if (line.match(/^"?Race Laps"?,\s*0\s*$/) || 
      line.match(/^"?Race Duration"?,\s*"?0h 0m 0s"?\s*$/) ||
      line.match(/^Cautions,\s*0\s*$/) ||
      line.match(/^"?Lead Changes"?,\s*0\s*$/)) {
    console.log('Found zeroed race data:', line);
    hasZeroedRaceData = true;
  }
}

console.log('Has empty track:', hasEmptyTrack);
console.log('Has zeroed race data:', hasZeroedRaceData);
console.log('Should be detected as playoff standings:', hasEmptyTrack && hasZeroedRaceData);

console.log('\n=== PLAYOFF STANDINGS PARSING TEST ===');
// Find where the data starts
let dataStartIndex = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Finish') && line.includes('Driver')) {
    console.log(`Found data header at line ${i}:`, line);
    dataStartIndex = i + 1;
    break;
  }
}

console.log('Data starts at line:', dataStartIndex);
console.log('Lines after header:');
for (let i = dataStartIndex; i < Math.min(dataStartIndex + 5, lines.length); i++) {
  if (lines[i]) {
    console.log(`${i}: ${lines[i]}`);
    
    // Test parsing this line
    const line = lines[i];
    if (!line.startsWith(',,')) continue;
    
    // Parse CSV line manually for testing
    const parts = line.split(',');
    console.log(`  Parts count: ${parts.length}`);
    console.log(`  First few parts:`, parts.slice(0, 10));
    
    if (parts.length >= 15) {
      const offset = 2; // Skip first two empty columns
      const position = parseInt(parts[offset]) || 0;
      const driver = (parts[offset + 4] || '').replace(/"/g, '').trim();
      const totalPoints = parseInt(parts[offset + 8]) || 0;
      
      console.log(`  Parsed: Position=${position}, Driver="${driver}", Points=${totalPoints}`);
    }
  }
}

console.log('\n=== METADATA PARSING TEST ===');
let metadata = {};
for (let i = 0; i < Math.min(15, lines.length); i++) {
  const line = lines[i];
  const metadataMatch = line.match(/^([^,]+),(.+)$/);
  if (metadataMatch) {
    const [, key, value] = metadataMatch;
    const cleanKey = key.replace(/"/g, '').trim();
    const cleanValue = value.replace(/"/g, '').trim();
    metadata[cleanKey] = cleanValue;
    console.log(`${cleanKey}: ${cleanValue}`);
  }
}

console.log('\nParsed metadata:', metadata);
console.log('Required fields present:');
console.log('- League:', !!metadata.League);
console.log('- Series:', !!metadata.Series); 
console.log('- Season:', !!metadata.Season);