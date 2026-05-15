import { db } from '@/lib/db'
import { testAirtableConnection } from '@/lib/airtable'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings/airtable - Get Airtable config
export async function GET() {
  try {
    const configs = await db.airtableConfig.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Mask tokens in response
    const masked = configs.map((c) => ({
      ...c,
      token: c.token ? `${c.token.substring(0, 10)}...${c.token.slice(-4)}` : '',
    }))

    return NextResponse.json(masked)
  } catch (error) {
    console.error('Error fetching airtable config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch airtable config' },
      { status: 500 }
    )
  }
}

// POST /api/settings/airtable - Create or update Airtable config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, baseId, token, tableName, isActive } = body

    if (!baseId || !token) {
      return NextResponse.json(
        { error: 'Base ID and Token are required' },
        { status: 400 }
      )
    }

    const tblName = tableName || 'Notifications'

    // Test connection before saving
    const testResult = await testAirtableConnection({
      baseId,
      token,
      tableName: tblName,
    })

    if (!testResult.ok) {
      return NextResponse.json(
        { error: `Connection test failed: ${testResult.error}` },
        { status: 400 }
      )
    }

    // Check if config already exists - upsert (only one config supported)
    const existing = await db.airtableConfig.findFirst()

    let config
    if (existing) {
      // If token contains "..." it means the user didn't change it, keep the old one
      const actualToken = token.includes('...') ? existing.token : token
      config = await db.airtableConfig.update({
        where: { id: existing.id },
        data: {
          baseUrl: baseUrl || `https://airtable.com/${baseId}`,
          baseId,
          token: actualToken,
          tableName: tblName,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    } else {
      config = await db.airtableConfig.create({
        data: {
          baseUrl: baseUrl || `https://airtable.com/${baseId}`,
          baseId,
          token,
          tableName: tblName,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    }

    // Mask token in response
    const masked = {
      ...config,
      token: config.token
        ? `${config.token.substring(0, 10)}...${config.token.slice(-4)}`
        : '',
    }

    return NextResponse.json(masked, { status: 201 })
  } catch (error) {
    console.error('Error saving airtable config:', error)
    return NextResponse.json(
      { error: 'Failed to save airtable config' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/airtable - Delete Airtable config
export async function DELETE() {
  try {
    const existing = await db.airtableConfig.findFirst()
    if (existing) {
      await db.airtableConfig.delete({ where: { id: existing.id } })
    }
    return NextResponse.json({ message: 'Airtable config deleted' })
  } catch (error) {
    console.error('Error deleting airtable config:', error)
    return NextResponse.json(
      { error: 'Failed to delete airtable config' },
      { status: 500 }
    )
  }
}
