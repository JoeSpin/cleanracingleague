import { NextRequest, NextResponse } from 'next/server'

// Simple password authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'crl-admin-2025'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    // Check if password matches
    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ 
        success: true, 
        message: 'Authentication successful' 
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}