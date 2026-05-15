import { NextRequest, NextResponse } from 'next/server'
import {
  getFilterRuleById,
  getFilterRuleByPrefix,
  updateFilterRule,
  deleteFilterRule,
  getNotifications,
  updateNotification,
} from '@/lib/supabase-db'
import { autoPushNotification } from '@/lib/auto-push'
import { emitWsEvent } from '@/lib/ws-client'
import { matchesFilterRule } from '@/lib/filter-match'

// PATCH /api/settings/filter-rules/[id] - Update a filter rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await getFilterRuleById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Filter rule not found' },
        { status: 404 }
      )
    }

    // If prefix is being changed, check for duplicates
    if (body.prefix && body.prefix !== existing.prefix) {
      const duplicate = await getFilterRuleByPrefix(body.prefix)
      if (duplicate) {
        return NextResponse.json(
          { error: 'A filter rule with this prefix already exists' },
          { status: 409 }
        )
      }
    }

    // Validate matchMode if provided
    if (
      body.matchMode !== undefined &&
      body.matchMode !== 'startsWith' &&
      body.matchMode !== 'contains'
    ) {
      return NextResponse.json(
        { error: 'matchMode must be "startsWith" or "contains"' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.prefix !== undefined) updateData.prefix = body.prefix
    if (body.matchMode !== undefined) updateData.matchMode = body.matchMode
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    try {
      const rule = await updateFilterRule(id, updateData)

      // If rule is being toggled ON, re-apply it to existing unfiltered notifications
      const isBeingActivated =
        body.isActive === true && !existing.isActive
      const prefixChanged =
        body.prefix !== undefined && body.prefix !== existing.prefix
      const matchModeChanged =
        body.matchMode !== undefined && body.matchMode !== existing.matchMode

      if (rule.isActive && (isBeingActivated || prefixChanged || matchModeChanged)) {
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
              // Best-effort, don't fail the update
            })
          }
        }
      }

      return NextResponse.json(rule)
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
    console.error('Error updating filter rule:', error)
    return NextResponse.json(
      { error: 'Failed to update filter rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/filter-rules/[id] - Delete a filter rule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await getFilterRuleById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Filter rule not found' },
        { status: 404 }
      )
    }

    await deleteFilterRule(id)

    return NextResponse.json({ message: 'Filter rule deleted' })
  } catch (error) {
    console.error('Error deleting filter rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete filter rule' },
      { status: 500 }
    )
  }
}
