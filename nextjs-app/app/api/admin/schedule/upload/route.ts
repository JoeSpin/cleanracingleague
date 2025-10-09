import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const series = formData.get('series') as string

    if (!file || !series) {
      return NextResponse.json(
        { error: 'Image and series are required' },
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

    // Generate filename
    const fileExtension = path.extname(file.name)
    const fileName = `${series}schedule${fileExtension}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public/img')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      // Directory might already exist
    }

    // Write file
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Return the public path
    const publicPath = `/img/${fileName}`

    return NextResponse.json({
      success: true,
      imagePath: publicPath,
      message: 'Schedule image uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading schedule image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}