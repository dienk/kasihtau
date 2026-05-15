import { NextRequest, NextResponse } from 'next/server'
import {
  getFilterRules,
  createFilterRule,
  getNotifications,
  updateNotification,
} from '@/lib/supabase-db'
import { autoPushNotification } from '@/lib/auto-push'
import { emitWsEvent } from '@/lib/ws-client'
import { matchesFilterRule } from '@/lib/filter-match'

// GET /api/settings/filter-rules - List all filter rules
export async function GET() {
  try {
    const rules = await getFilterRules()

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
    const { prefix, matchMode, isActive } = body

    if (!prefix) {
      return NextResponse.json(
        { error: 'Prefix is required' },
        { status: 400 }
      )
    }

    // Validate matchMode
    const validMatchMode =
      matchMode === 'startsWith' || matchMode === 'contains'
        ? matchMode
        : 'contains'

    try {
      const rule = await createFilterRule({
        prefix,
        matchMode: validMatchMode,
        isActive: isActive !== undefined ? isActive : true,
      })

      // If the rule is active, check all existing unfiltered notifications
      if (rule.isActive) {
        const unfilteredNotifications = await getNotifications({ isFiltered: false })

        for (const notification of unfilteredNotifications) {
          if (matchesFilterRule(notification.message, rule)) {
            const updated = await updateNotification(notification.id, {
              isFiltered: true,
              prefix: rule.prefix,
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
    } catch (err: any) {
      if (err.message === 'DUPLICATE_PREFIX') {
        return NextResponse.json(
          { error: 'A filter rule with this prefix already exists' },
          { status: 409 }
        )
      }
      throw err
    }
  } catch (error) {
    console.error('Error creating filter rule:', error)
    return NextResponse.json(
      { error: 'Failed to create filter rule' },
      { status: 500 }
    )
  }
}
