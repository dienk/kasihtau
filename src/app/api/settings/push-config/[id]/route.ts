import { NextRequest, NextResponse } from 'next/server'
import { getPushConfigById, updatePushConfig, deletePushConfig } from '@/lib/supabase-db'

// PATCH /api/settings/push-config/[id] - Update a push config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await getPushConfigById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Push config not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.url !== undefined) updateData.url = body.url
    if (body.method !== undefined) updateData.method = body.method
    if (body.headers !== undefined) {
      // Handle headers: can be a string (already JSON) or object
      if (typeof body.headers === 'string') {
        try {
          JSON.parse(body.headers)
          updateData.headers = body.headers
        } catch {
          updateData.headers = '{}'
        }
      } else {
        updateData.headers = JSON.stringify(body.headers)
      }
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const config = await updatePushConfig(id, updateData)

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating push config:', error)
    return NextResponse.json(
      { error: 'Failed to update push config' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/push-config/[id] - Delete a push config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await getPushConfigById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Push config not found' },
        { status: 404 }
      )
    }

    await deletePushConfig(id)

    return NextResponse.json({ message: 'Push config deleted' })
  } catch (error) {
    console.error('Error deleting push config:', error)
    return NextResponse.json(
      { error: 'Failed to delete push config' },
      { status: 500 }
    )
  }
}
