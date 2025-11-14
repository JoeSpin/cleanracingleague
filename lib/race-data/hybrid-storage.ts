// Enhanced storage helper that works in both development and production
import { put, del, list } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

export async function saveRaceDataFile(fileName: string, content: string): Promise<string> {
  if (isProduction) {
    // Use Vercel Blob in production
    const blob = await put(fileName, content, {
      access: 'public',
      contentType: 'application/json'
    });
    return blob.url;
  } else {
    // Use local filesystem in development
    const filePath = path.join(process.cwd(), 'data', fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }
}

export async function deleteRaceDataFile(fileName: string): Promise<void> {
  if (isProduction) {
    // Delete from Vercel Blob
    await del(fileName);
  } else {
    // Delete from local filesystem
    const filePath = path.join(process.cwd(), 'data', fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }
}

export async function readRaceDataFile(fileName: string): Promise<string> {
  if (isProduction) {
    // Read from Vercel Blob
    const response = await fetch(`https://${process.env.BLOB_READ_WRITE_TOKEN}/${fileName}`);
    if (!response.ok) {
      throw new Error(`File not found: ${fileName}`);
    }
    return await response.text();
  } else {
    // Read from local filesystem
    const filePath = path.join(process.cwd(), 'data', fileName);
    return await fs.readFile(filePath, 'utf-8');
  }
}

export async function listRaceDataFiles(): Promise<string[]> {
  if (isProduction) {
    // List files from Vercel Blob
    const { blobs } = await list();
    return blobs.map(blob => blob.pathname);
  } else {
    // List files from local filesystem
    const dataDir = path.join(process.cwd(), 'data');
    const files: string[] = [];
    
    try {
      const seriesDirs = await fs.readdir(dataDir, { withFileTypes: true });
      
      for (const seriesDir of seriesDirs) {
        if (seriesDir.isDirectory()) {
          const seriesPath = path.join(dataDir, seriesDir.name);
          const seriesFiles = await fs.readdir(seriesPath);
          
          for (const file of seriesFiles) {
            if (file.endsWith('.json')) {
              files.push(`${seriesDir.name}/${file}`);
            }
          }
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }
}