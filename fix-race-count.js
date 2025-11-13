const fs = require('fs');
const path = require('path');

// Read the season data
const seasonFile = path.join(__dirname, 'data/truck/crl-truck-series-season-24.json');
const seasonData = JSON.parse(fs.readFileSync(seasonFile, 'utf-8'));

console.log('Season data loaded:');
console.log('- Series:', seasonData.series);
console.log('- Season:', seasonData.season);
console.log('- Races in file:', seasonData.races.length);

// The issue is likely in the summary file - let's regenerate it
console.log('\nRace details:');
seasonData.races.forEach((race, index) => {
  console.log(`Race ${index + 1}: ${race.metadata.track} (${race.metadata.raceDate}) - ${race.results.length} drivers`);
});

// Update the race numbers to be sequential
seasonData.races.forEach((race, index) => {
  race.metadata.raceNumber = index + 1;
});

// Determine current race (10 races completed, so current race is 10, next would be 11)
const completedRaces = seasonData.races.length;
const currentRace = completedRaces; // Last completed race

console.log('\nCorrect values:');
console.log('- Completed races:', completedRaces);
console.log('- Current race:', currentRace);

// Save the corrected season data
fs.writeFileSync(seasonFile, JSON.stringify(seasonData, null, 2));
console.log('\nSeason data updated with correct race numbers');