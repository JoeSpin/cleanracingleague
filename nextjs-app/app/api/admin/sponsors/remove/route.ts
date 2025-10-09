import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

// Mock data structure - in production, use a database
let sponsorsData: Record<string, Array<{id: string, name: string, image: string}>> = {
  arca: [],
  elite: [],
  trucks: []
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { sponsorId, series } = body

    if (!sponsorId || !series) {
      return NextResponse.json(
        { error: 'Sponsor ID and series are required' },
        { status: 400 }
      )
    }

    if (!['arca', 'elite', 'trucks'].includes(series)) {
      return NextResponse.json(
        { error: 'Invalid series' },
        { status: 400 }
      )
    }

    // Find sponsor in mock data
    const seriesSponsors = sponsorsData[series] || []
    const sponsorIndex = seriesSponsors.findIndex(s => s.id === sponsorId)
    
    if (sponsorIndex === -1) {
      return NextResponse.json(
        { error: 'Sponsor not found' },
        { status: 404 }
      )
    }

    const sponsor = seriesSponsors[sponsorIndex]

    // Try to delete the image file
    try {
      const imagePath = path.join(process.cwd(), 'public', sponsor.image)
      await unlink(imagePath)
    } catch (err) {
      console.error('Error deleting image file:', err)
      // Continue even if file deletion fails
    }

    // Remove sponsor from mock data
    sponsorsData[series].splice(sponsorIndex, 1)

    return NextResponse.json({
      success: true,
      message: 'Sponsor removed successfully'
    })
  } catch (error) {
    console.error('Error removing sponsor:', error)
    return NextResponse.json(
      { error: 'Failed to remove sponsor' },
      { status: 500 }
    )
  }
}