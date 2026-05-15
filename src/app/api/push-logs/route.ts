import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/push-logs - List all push logs with notification data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    const logs = await db.pushLog.findMany({
      orderBy: { pushedAt: 'desc' },
      take: limit,
      include: {
        notification: {
          select: {
            id: true,
            appName: true,
            title: true,
            message: true,
            prefix: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching push logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch push logs' },
      { status: 500 }
    )
  }
}
