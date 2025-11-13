'use client'

import { parseRaceCSV } from '@/lib/race-data/csv-parser';
import { useState } from 'react';

export default function TestCSVPage() {
  const [result, setResult] = useState<any>(null);
  
  const testCSV = () => {
    const sampleCSV = `League,"Clean Racing League Trucks"
Series,Truck
Season,"CRL Truck Series Season 24"
"Race Date","Nov 10, 2025"
Track,"Atlanta Motor Speedway"
"Race Laps",103`;

    try {
      const parsedResult = parseRaceCSV(sampleCSV);
      setResult(parsedResult);
      console.log('Parsed race data:', JSON.stringify(parsedResult, null, 2));
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setResult({ error: 'Failed to parse CSV' });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>CSV Parser Test</h1>
      <button onClick={testCSV} style={{ padding: '10px 20px', marginBottom: '20px' }}>
        Test CSV Parser
      </button>
      {result && (
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}