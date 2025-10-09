import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Configure API route for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log('Schedule upload API called')
    const formData = await request.formData()
    const file = formData.get('image') as File
    const series = formData.get('series') as string

    console.log('Received file:', file ? file.name : 'No file')
    console.log('Received series:', series)

    if (!file || !series) {
      console.error('Missing file or series:', { file: !!file, series })
      return NextResponse.json(
        { error: 'Image and series are required' },
        { status: 400 }
      )
    }

    if (!['arca', 'elite', 'trucks'].includes(series)) {
      console.error('Invalid series:', series)
      return NextResponse.json(
        { error: 'Invalid series' },
        { status: 400 }
      )
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size)
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'File must be an image (JPG, PNG, GIF, or WebP)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    console.log('Converting file to buffer, size:', file.size)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate filename
    const fileExtension = path.extname(file.name)
    const fileName = `${series}schedule${fileExtension}`
    console.log('Generated filename:', fileName)
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public/img')
    console.log('Upload directory:', uploadDir)
    
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('Directory created/verified')
    } catch (err) {
      console.log('Directory creation error (might already exist):', err)
    }

    // Write file
    const filePath = path.join(uploadDir, fileName)
    console.log('Writing file to:', filePath)
    await writeFile(filePath, buffer)
    console.log('File written successfully')

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