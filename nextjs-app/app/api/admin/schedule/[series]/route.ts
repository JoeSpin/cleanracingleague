import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import path from 'path'

// Get current schedule image for a series
export async function GET(
  request: NextRequest,
  { params }: { params: { series: string } }
) {
  try {
    const series = params.series

    if (!['arca', 'elite', 'trucks'].includes(series)) {
      return NextResponse.json(
        { error: 'Invalid series' },
        { status: 400 }
      )
    }

    // Default fallback images
    const defaultImages: Record<string, string> = {
      arca: '/img/arcaschedule.jpg',
      elite: '/img/eliteschedule.jpg', 
      trucks: '/img/crltrucksschedule.png'
    }

    let currentImage = defaultImages[series]

    try {
      // Check for dynamically uploaded schedule images
      const publicDir = path.join(process.cwd(), 'public/img')
      const files = await readdir(publicDir)
      
      // Look for files that match the series pattern: {series}schedule.{ext}
      const schedulePattern = new RegExp(`^${series}schedule\\.(jpg|jpeg|png|gif|webp)$`, 'i')
      const scheduleFile = files.find(file => schedulePattern.test(file))
      
      if (scheduleFile) {
        // Check if file exists and get its modification time
        const filePath = path.join(publicDir, scheduleFile)
        const stats = await stat(filePath)
        
        // Use the dynamically uploaded file
        currentImage = `/img/${scheduleFile}`
        
        console.log(`Found dynamic schedule image for ${series}: ${currentImage}`)
      } else {
        console.log(`No dynamic schedule image found for ${series}, using default: ${currentImage}`)
      }
    } catch (fsError) {
      console.error('Error checking for dynamic schedule images:', fsError)
      // Continue with default image
    }

    return NextResponse.json({
      series,
      image: currentImage
    })
  } catch (error) {
    console.error('Error getting schedule image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}