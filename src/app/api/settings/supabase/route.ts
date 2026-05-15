import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseDbConfig,
  saveSupabaseDbConfig,
  removeSupabaseDbConfig,
  isSupabaseConfigured,
} from '@/lib/supabase-db'

// GET /api/settings/supabase - Get Supabase database config (mask anonKey)
export async function GET() {
  try {
    const config = getSupabaseDbConfig()

    if (!config.isConfigured) {
      return NextResponse.json([])
    }

    // Mask the anonKey in response
    const masked = {
      id: 'supabase-db-config',
      url: config.url,
      anonKey:
        config.anonKey.length > 14
          ? `${config.anonKey.substring(0, 10)}...${config.anonKey.slice(-4)}`
          : '****',
      isActive: true,
      tablesReady: config.tablesReady,
    }

    return NextResponse.json([masked])
  } catch (error) {
    console.error('Error fetching supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Supabase config' },
      { status: 500 }
    )
  }
}

// POST /api/settings/supabase - Save Supabase database config
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

    // If anonKey contains "..." it means the user didn't change it, keep the old one
    const currentConfig = getSupabaseDbConfig()
    const actualAnonKey = anonKey.includes('...') ? currentConfig.anonKey : anonKey

    const result = await saveSupabaseDbConfig(url, actualAnonKey)

    if (!result.ok) {
      return NextResponse.json(
        { error: `Connection test failed: ${result.error}` },
        { status: 400 }
      )
    }

    const config = getSupabaseDbConfig()

    // Mask the anonKey in response
    const masked = {
      id: 'supabase-db-config',
      url: config.url,
      anonKey:
        config.anonKey.length > 14
          ? `${config.anonKey.substring(0, 10)}...${config.anonKey.slice(-4)}`
          : '****',
      isActive: true,
      tablesReady: config.tablesReady,
    }

    return NextResponse.json(masked)
  } catch (error) {
    console.error('Error saving supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to save Supabase config' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/supabase - Delete Supabase database config
export async function DELETE() {
  try {
    removeSupabaseDbConfig()
    return NextResponse.json({ message: 'Supabase config deleted' })
  } catch (error) {
    console.error('Error deleting supabase config:', error)
    return NextResponse.json(
      { error: 'Failed to delete Supabase config' },
      { status: 500 }
    )
  }
}
