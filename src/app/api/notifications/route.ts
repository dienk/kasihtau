import { NextRequest, NextResponse } from 'next/server'
import {
  getNotifications,
  createNotification,
  getActiveFilterRules,
  deleteAllNotifications,
} from '@/lib/supabase-db'
import { autoPushNotification } from '@/lib/auto-push'
import { emitWsEvent } from '@/lib/ws-client'
import { findMatchingRule } from '@/lib/filter-match'

// GET /api/notifications - List all notifications with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const search = searchParams.get('search')

    const filters: Record<string, unknown> = {}

    if (filter === 'filtered') {
      filters.isFiltered = true
    } else if (filter === 'unfiltered') {
      filters.isFiltered = false
    } else if (filter === 'pushed') {
      filters.isPushed = true
    } else if (filter === 'unread') {
      filters.isRead = false
    }

    if (search) {
      filters.search = search
    }

    const notifications = await getNotifications(filters)

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification with auto-filter and auto-push
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

    // Check against active filter rules using shared matching logic
    const activeRules = await getActiveFilterRules()

    const matchedRule = findMatchingRule(message, activeRules)

    const isFiltered = matchedRule !== null
    const matchedPrefix = matchedRule?.prefix ?? null

    const notification = await createNotification({
      appName: appName || 'Unknown',
      title,
      message,
      isFiltered,
      prefix: matchedPrefix,
    })

    // Emit notification:created event
    emitWsEvent('notification:created', {
      id: notification.id,
      appName: notification.appName,
      title: notification.title,
      message: notification.message,
      isFiltered,
      prefix: matchedPrefix,
    })

    // Auto-push if filtered
    let pushResult: Record<string, unknown> | null = null
    if (isFiltered) {
      pushResult = await autoPushNotification(notification)
    }

    return NextResponse.json(
      { ...notification, autoPushResult: pushResult },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Delete all notifications (clear all)
export async function DELETE() {
  try {
    const deletedCount = await deleteAllNotifications()

    // Emit event
    emitWsEvent('notifications:cleared', { count: deletedCount })

    return NextResponse.json({
      message: `Cleared ${deletedCount} notifications`,
      deletedCount,
    })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}
