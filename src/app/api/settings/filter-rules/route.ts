import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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
          await db.notification.update({
            where: { id: notification.id },
            data: {
              isFiltered: true,
              prefix: rule.prefix,
            },
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
