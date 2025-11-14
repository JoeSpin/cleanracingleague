'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'crlbarrels';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundWinners, setRoundWinners] = useState<string>('');
  const [raceNumber, setRaceNumber] = useState<string>('');
  const [playoffRound, setPlayoffRound] = useState<string>('');
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Handle password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPassword('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a CSV file');
      setFile(null);
    }
  };

  const loadExistingFiles = async () => {
    setLoadingFiles(true);
    try {
      // Add cache-busting timestamp and headers
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/manage-files?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setExistingFiles(data.files || []);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err) {
      setError('Failed to load files');
    }
    setLoadingFiles(false);
  };

  const deleteFile = async (filePath: string, fileType: string) => {
    if (!confirm(`Are you sure you want to delete this ${fileType}?`)) return;
    
    try {
      const response = await fetch('/api/manage-files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      
      if (response.ok) {
        loadExistingFiles(); // Reload the file list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete file');
      }
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add round winners if specified
      if (roundWinners.trim()) {
        formData.append('roundWinners', roundWinners);
      }
      
      // Add race number if specified
      if (raceNumber.trim()) {
        formData.append('raceNumber', raceNumber);
      }
      
      // Add playoff round if specified
      if (playoffRound.trim()) {
        formData.append('playoffRound', playoffRound);
      }

      const response = await fetch('/api/upload-race', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Reload the file list to show updated files
        loadExistingFiles();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadExistingFiles();
  }, []);

  return (
    <>
      {!isAuthenticated ? (
        <div className={styles.passwordContainer}>
          <div className={styles.passwordForm}>
            <h1>Admin Access</h1>
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.passwordInput}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              {passwordError && (
                <div className={styles.error}>{passwordError}</div>
              )}
              <button type="submit" className={styles.loginButton}>
                Access Admin Panel
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className={styles.container}>
          <h1>Race Data Admin</h1>
      
      <div className={styles.uploadSection}>
        <h2>Upload Race Results CSV</h2>
        <p>Upload a CSV file containing race results data to update standings and race history.</p>
        
        <div className={styles.uploadForm}>
          <input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          
          {file && (
            <div className={styles.fileInfo}>
              <p>Selected: {file.name}</p>
              <p>Size: {(file.size / 1024).toFixed(1)} KB</p>
            </div>
          )}

          <div className={styles.optionalField}>
            <label htmlFor="raceNumber" className={styles.fieldLabel}>
              Race Number (optional):
            </label>
            <input
              id="raceNumber"
              type="number"
              min="1"
              max="15"
              value={raceNumber}
              onChange={(e) => setRaceNumber(e.target.value)}
              placeholder="Enter race number (1-15)"
              className={styles.textInput}
            />
            <p className={styles.fieldHelp}>
              Specify which race this data is for. Leave blank for auto-detection or new race.
            </p>
          </div>

          <div className={styles.optionalField}>
            <label htmlFor="playoffRound" className={styles.fieldLabel}>
              Playoff Round (optional):
            </label>
            <select
              id="playoffRound"
              value={playoffRound}
              onChange={(e) => setPlayoffRound(e.target.value)}
              className={styles.textInput}
            >
              <option value="">Auto-detect or regular season</option>
              <option value="Round of 12">Round of 12</option>
              <option value="Round of 8">Round of 8</option>
              <option value="Championship 4">Championship 4</option>
            </select>
            <p className={styles.fieldHelp}>
              For playoff standings: Specify which playoff round this is for.
            </p>
          </div>

          <div className={styles.optionalField}>
            <label htmlFor="roundWinners" className={styles.fieldLabel}>
              Round Winners (optional):
            </label>
            <input
              id="roundWinners"
              type="text"
              value={roundWinners}
              onChange={(e) => setRoundWinners(e.target.value)}
              placeholder="Enter driver names separated by commas (e.g., Ross Tatum, Parker Collins)"
              className={styles.textInput}
            />
            <p className={styles.fieldHelp}>
              For playoff standings: Enter drivers who won races specifically in this playoff round.
              Only wins from the current round advance drivers automatically.
            </p>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={styles.uploadButton}
          >
            {uploading ? 'Uploading...' : 'Upload Race Data'}
          </button>
        </div>
        
        {error && (
          <div className={styles.error}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        {result && (
          <div className={styles.success}>
            <h3>Upload Successful!</h3>
            <div className={styles.resultDetails}>
              {result.type === 'playoff_standings' && result.playoff ? (
                <>
                  <p><strong>Type:</strong> Playoff Standings Update</p>
                  <p><strong>Series:</strong> {result.playoff.series}</p>
                  <p><strong>Season:</strong> {result.playoff.season}</p>
                  <p><strong>Round:</strong> {result.playoff.round}</p>
                  <p><strong>Update Date:</strong> {result.playoff.updateDate}</p>
                  <p><strong>Leader:</strong> {result.playoff.leader}</p>
                  <p><strong>Drivers:</strong> {result.playoff.driversCount}</p>
                  <p><strong>Status:</strong> <span style={{color: '#dc3545'}}>Replaced existing round data</span></p>
                </>
              ) : result.race ? (
                <>
                  <p><strong>Type:</strong> Race Results {result.race.isReplacement && <span style={{color: '#dc3545'}}>(Replacement)</span>}</p>
                  <p><strong>Series:</strong> {result.race.series}</p>
                  <p><strong>Season:</strong> {result.race.season}</p>
                  <p><strong>Race Number:</strong> {result.race.raceNumber || 'Auto-assigned'}</p>
                  <p><strong>Track:</strong> {result.race.track}</p>
                  <p><strong>Date:</strong> {result.race.date}</p>
                  <p><strong>Winner:</strong> {result.race.winner}</p>
                  <p><strong>Participants:</strong> {result.race.participants}</p>
                </>
              ) : (
                <p>Upload successful but missing details.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.filesSection}>
        <h2>Manage Existing Files</h2>
        <p>View and manage race data and playoff standings files.</p>
        
        <button 
          onClick={loadExistingFiles} 
          className={styles.refreshButton}
          disabled={loadingFiles}
        >
          {loadingFiles ? 'Loading...' : 'Refresh File List'}
        </button>

        {existingFiles.length > 0 ? (
          <div className={styles.filesList}>
            {existingFiles.map((fileGroup, index) => (
              <div key={index} className={styles.fileGroup}>
                <h3>{fileGroup.series} - {fileGroup.season}</h3>
                
                {fileGroup.races && fileGroup.races.length > 0 && (
                  <div className={styles.fileCategory}>
                    <h4>Race Results ({fileGroup.races.length} races)</h4>
                    <div className={styles.fileGrid}>
                      {fileGroup.races.map((race: any, raceIndex: number) => (
                        <div key={raceIndex} className={styles.fileItem}>
                          <div className={styles.fileInfo}>
                            <strong>Race {race.raceNumber}</strong>
                            <span>{race.track}</span>
                            <span>{race.date}</span>
                          </div>
                          <button 
                            onClick={() => deleteFile(race.filePath, 'race')}
                            className={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fileGroup.playoffs && fileGroup.playoffs.length > 0 && (
                  <div className={styles.fileCategory}>
                    <h4>Playoff Standings ({fileGroup.playoffs.length} rounds)</h4>
                    <div className={styles.fileGrid}>
                      {fileGroup.playoffs.map((playoff: any, playoffIndex: number) => (
                        <div key={playoffIndex} className={styles.fileItem}>
                          <div className={styles.fileInfo}>
                            <strong>{playoff.round}</strong>
                            <span>{playoff.updateDate}</span>
                            <span>{playoff.driversCount} drivers</span>
                          </div>
                          <button 
                            onClick={() => deleteFile(playoff.filePath, 'playoff round')}
                            className={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noFiles}>No files found. Upload some race data to get started!</p>
        )}
      </div>
      
      <div className={styles.apiSection}>
        <h2>API Endpoints</h2>
        <div className={styles.endpointList}>
          <div className={styles.endpoint}>
            <strong>Standings:</strong>
            <code>/api/standings-csv?series=truck&season=crl-truck-series-season-24</code>
          </div>
          <div className={styles.endpoint}>
            <strong>Latest Race:</strong>
            <code>/api/race-results-csv?series=truck&season=crl-truck-series-season-24</code>
          </div>
          <div className={styles.endpoint}>
            <strong>All Races:</strong>
            <code>/api/race-results-csv?series=truck&season=crl-truck-series-season-24&all=true</code>
          </div>
        </div>
      </div>
        </div>
      )}
    </>
  );
}