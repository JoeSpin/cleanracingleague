import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    environment: process.env.NODE_ENV || 'development',
    blobStorage: !!process.env.BLOB_READ_WRITE_TOKEN,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(status);
}