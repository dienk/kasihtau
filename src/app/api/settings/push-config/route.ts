import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings/push-config - List all push configs
export async function GET() {
  try {
    const configs = await db.pushConfig.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(configs)
  } catch (error) {
    console.error('Error fetching push configs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch push configs' },
      { status: 500 }
    )
  }
}

// POST /api/settings/push-config - Create a new push config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, method, headers } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Handle headers: can be a string (already JSON) or object
    let headersStr = '{}'
    if (headers) {
      if (typeof headers === 'string') {
        // Validate it's valid JSON
        try {
          JSON.parse(headers)
          headersStr = headers
        } catch {
          headersStr = '{}'
        }
      } else {
        headersStr = JSON.stringify(headers)
      }
    }

    const config = await db.pushConfig.create({
      data: {
        url,
        method: method || 'POST',
        headers: headersStr,
      },
    })

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    console.error('Error creating push config:', error)
    return NextResponse.json(
      { error: 'Failed to create push config' },
      { status: 500 }
    )
  }
}
