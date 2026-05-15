import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/notifications/[id] - Update a notification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (typeof body.isRead === 'boolean') {
      updateData.isRead = body.isRead
    }
    if (typeof body.isFiltered === 'boolean') {
      updateData.isFiltered = body.isFiltered
    }
    if (body.prefix !== undefined) {
      updateData.prefix = body.prefix
    }

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    await db.notification.delete({ where: { id } })

    return NextResponse.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
