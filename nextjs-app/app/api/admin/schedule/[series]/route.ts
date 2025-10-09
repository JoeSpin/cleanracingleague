import { NextRequest, NextResponse } from 'next/server'

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

    // Map series to current schedule images
    const scheduleImages: Record<string, string> = {
      arca: '/img/arcaschedule.jpg',
      elite: '/img/eliteschedule.jpg', 
      trucks: '/img/crltrucksschedule.png'
    }

    return NextResponse.json({
      series,
      image: scheduleImages[series] || null
    })
  } catch (error) {
    console.error('Error getting schedule image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}