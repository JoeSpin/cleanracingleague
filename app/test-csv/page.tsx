import { parseRaceCSV } from '@/lib/race-data/csv-parser';

// Test the CSV parser with the sample data
const testCSV = async () => {
  const sampleCSV = `League,"Clean Racing League Trucks"
Series,Truck
Season,"CRL Truck Series Season 24"
"Race Date","Nov 10, 2025"
Track,"Atlanta Motor Speedway"
"Race Laps",103
"Race Duration","1h 11m 0s"
Cautions,6
"Caution Laps",13
"Lead Changes",22
Leaders,6
,,Finish,"Finish Class",Start,"Start Class",Driver,"iRacing License",iRating,"iRacing SR","Total Points","Race Points","Stage Points","Bonus Points","Penalty Points",Interval,"Laps Completed","Laps Led",Car,"Fastest Lap","Fastest Lap #","Average Lap",Incidents,Status,"Car Number"
,,1,1,31,31,"Ross Tatum","Class A",3607,2.95,42,40,0,2,0,-,103,23,"NASCAR Truck Chevrolet Silverado",29.829,1:43.0,40.585,0,Running,91
,,2,2,1,1,"Darin Stapf","Class B",2207,2.5,36,35,0,1,0,-0.0736,103,20,"NASCAR Truck Toyota Tundra TRD Pro",29.836,1:43.0,40.586,4,Running,55`;

  const result = parseRaceCSV(sampleCSV);
  console.log('Parsed race data:', JSON.stringify(result, null, 2));
};

export default function TestPage() {
  return (
    <div>
      <h1>CSV Parser Test</h1>
      <button onClick={() => testCSV()}>Test CSV Parser</button>
      <p>Check the browser console for results</p>
    </div>
  );
}