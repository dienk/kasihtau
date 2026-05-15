import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/settings/filter-rules/[id] - Update a filter rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.filterRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Filter rule not found' },
        { status: 404 }
      )
    }

    // If prefix is being changed, check for duplicates
    if (body.prefix && body.prefix !== existing.prefix) {
      const duplicate = await db.filterRule.findUnique({
        where: { prefix: body.prefix },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A filter rule with this prefix already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.prefix !== undefined) updateData.prefix = body.prefix
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const rule = await db.filterRule.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(rule)
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

    const existing = await db.filterRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Filter rule not found' },
        { status: 404 }
      )
    }

    await db.filterRule.delete({ where: { id } })

    return NextResponse.json({ message: 'Filter rule deleted' })
  } catch (error) {
    console.error('Error deleting filter rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete filter rule' },
      { status: 500 }
    )
  }
}
