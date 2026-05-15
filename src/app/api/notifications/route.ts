import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications - List all notifications with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (filter === 'filtered') {
      where.isFiltered = true
    } else if (filter === 'unfiltered') {
      where.isFiltered = false
    } else if (filter === 'pushed') {
      where.isPushed = true
    } else if (filter === 'unread') {
      where.isRead = false
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ]
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appName, title, message } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    // Check against active filter rules
    const activeRules = await db.filterRule.findMany({
      where: { isActive: true },
    })

    let isFiltered = false
    let matchedPrefix: string | null = null

    for (const rule of activeRules) {
      if (message.toLowerCase().startsWith(rule.prefix.toLowerCase())) {
        isFiltered = true
        matchedPrefix = rule.prefix
        break
      }
    }

    const notification = await db.notification.create({
      data: {
        appName: appName || 'Unknown',
        title,
        message,
        isFiltered,
        prefix: matchedPrefix,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
