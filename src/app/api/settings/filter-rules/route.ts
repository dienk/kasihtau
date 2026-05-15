import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { autoPushNotification } from '@/lib/auto-push'
import { emitWsEvent } from '@/lib/ws-client'

// GET /api/settings/filter-rules - List all filter rules
export async function GET() {
  try {
    const rules = await db.filterRule.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching filter rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter rules' },
      { status: 500 }
    )
  }
}

// POST /api/settings/filter-rules - Create a new filter rule
// Auto-filters existing notifications AND auto-pushes them if push config is active
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prefix, isActive } = body

    if (!prefix) {
      return NextResponse.json(
        { error: 'Prefix is required' },
        { status: 400 }
      )
    }

    // Check for duplicate prefix
    const existing = await db.filterRule.findUnique({ where: { prefix } })
    if (existing) {
      return NextResponse.json(
        { error: 'A filter rule with this prefix already exists' },
        { status: 409 }
      )
    }

    const rule = await db.filterRule.create({
      data: {
        prefix,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // If the rule is active, check all existing unfiltered notifications
    if (rule.isActive) {
      const unfilteredNotifications = await db.notification.findMany({
        where: { isFiltered: false },
      })

      for (const notification of unfilteredNotifications) {
        if (
          notification.message
            .toLowerCase()
            .startsWith(rule.prefix.toLowerCase())
        ) {
          const updated = await db.notification.update({
            where: { id: notification.id },
            data: {
              isFiltered: true,
              prefix: rule.prefix,
            },
          })

          // Emit notification:filtered event
          emitWsEvent('notification:filtered', {
            id: updated.id,
            appName: updated.appName,
            title: updated.title,
            prefix: rule.prefix,
          })

          // Auto-push the newly filtered notification
          autoPushNotification(updated).catch(() => {
            // Best-effort, don't fail the rule creation
          })
        }
      }
    }

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating filter rule:', error)
    return NextResponse.json(
      { error: 'Failed to create filter rule' },
      { status: 500 }
    )
  }
}
