import { db } from '@/lib/db'
import { testSupabaseConnection } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings/supabase - List all Supabase configs (mask anonKey)
export async function GET() {
  try {
    const configs = await db.supabaseConfig.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Mask the anonKey in response: show first 10 chars + "..." + last 4 chars
    const masked = configs.map((c) => ({
      ...c,
      anonKey:
        c.anonKey.length > 14
          ? `${c.anonKey.substring(0, 10)}...${c.anonKey.slice(-4)}`
          : '****',
    }))

    return NextResponse.json(masked)
  } catch (error) {
    console.error('Error fetching supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Supabase config' },
      { status: 500 }
    )
  }
}

// POST /api/settings/supabase - Create or update Supabase config (upsert - only one)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, anonKey, isActive } = body

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase URL and Anon Key are required' },
        { status: 400 }
      )
    }

    // Test connection before saving
    const testResult = await testSupabaseConnection({ url, anonKey })

    if (!testResult.ok) {
      return NextResponse.json(
        { error: `Connection test failed: ${testResult.error}` },
        { status: 400 }
      )
    }

    // Check if config already exists - upsert (only one config supported)
    const existing = await db.supabaseConfig.findFirst()

    let config
    if (existing) {
      // If anonKey contains "..." it means the user didn't change it, keep the old one
      const actualAnonKey = anonKey.includes('...') ? existing.anonKey : anonKey
      config = await db.supabaseConfig.update({
        where: { id: existing.id },
        data: {
          url,
          anonKey: actualAnonKey,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    } else {
      config = await db.supabaseConfig.create({
        data: {
          url,
          anonKey,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    }

    // Mask the anonKey in response
    const masked = {
      ...config,
      anonKey:
        config.anonKey.length > 14
          ? `${config.anonKey.substring(0, 10)}...${config.anonKey.slice(-4)}`
          : '****',
    }

    return NextResponse.json(masked, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Error saving supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to save Supabase config' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/supabase - Delete Supabase config
export async function DELETE() {
  try {
    const existing = await db.supabaseConfig.findFirst()
    if (existing) {
      await db.supabaseConfig.delete({ where: { id: existing.id } })
    }
    return NextResponse.json({ message: 'Supabase config deleted' })
  } catch (error) {
    console.error('Error deleting supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to delete Supabase config' },
      { status: 500 }
    )
  }
}
