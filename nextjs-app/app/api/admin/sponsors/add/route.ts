import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Mock data structure - in production, use a database
let sponsorsData: Record<string, Array<{id: string, name: string, image: string}>> = {
  arca: [],
  elite: [],
  trucks: []
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const series = formData.get('series') as string
    const name = formData.get('name') as string

    if (!file || !series || !name) {
      return NextResponse.json(
        { error: 'Image, series, and name are required' },
        { status: 400 }
      )
    }

    if (!['arca', 'elite', 'trucks'].includes(series)) {
      return NextResponse.json(
        { error: 'Invalid series' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const fileExtension = path.extname(file.name)
    const fileName = `${series}-sponsor-${Date.now()}${fileExtension}`
    
    // Create sponsors directory if it doesn't exist
    const sponsorDir = path.join(process.cwd(), 'public/img/sponsors')
    try {
      await mkdir(sponsorDir, { recursive: true })
    } catch (err) {
      // Directory might already exist
    }

    // Write file
    const filePath = path.join(sponsorDir, fileName)
    await writeFile(filePath, buffer)

    // Create sponsor object
    const sponsor = {
      id: `${series}-${Date.now()}`,
      name: name,
      image: `/img/sponsors/${fileName}`
    }

    // Add to mock data (in production, save to database)
    if (!sponsorsData[series]) {
      sponsorsData[series] = []
    }
    sponsorsData[series].push(sponsor)

    return NextResponse.json({
      success: true,
      sponsor,
      message: 'Sponsor added successfully'
    })
  } catch (error) {
    console.error('Error adding sponsor:', error)
    return NextResponse.json(
      { error: 'Failed to add sponsor' },
      { status: 500 }
    )
  }
}