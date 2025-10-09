import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

interface Sponsor {
  id: string
  name: string
  image: string
}

// Mock data structure - in a real app, this would be in a database
const sponsorsData: Record<string, Sponsor[]> = {
  arca: [
    { id: '1', name: 'Sponsor 1', image: '/public/img/sponsors/Sponsor1.png' },
    { id: '2', name: 'Sponsor 2', image: '/public/img/sponsors/Sponsor2.png' }
  ],
  elite: [
    { id: '3', name: 'Sponsor 3', image: '/public/img/sponsors/Sponsor3.png' },
    { id: '4', name: 'Sponsor 4', image: '/public/img/sponsors/Sponsor4.png' }
  ],
  trucks: [
    { id: '1', name: 'Sponsor 1', image: '/public/img/sponsors/Sponsor1.png' },
    { id: '2', name: 'Sponsor 2', image: '/public/img/sponsors/Sponsor2.png' }
  ]
}

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

    const sponsors = sponsorsData[series] || []

    return NextResponse.json({
      series,
      sponsors
    })
  } catch (error) {
    console.error('Error getting sponsors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}