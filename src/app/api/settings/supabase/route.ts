import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseDbConfig,
  saveSupabaseDbConfig,
  removeSupabaseDbConfig,
  isSupabaseConfigured,
  testSupabaseDbConnection,
  markSupabaseTablesReady,
  SUPABASE_SETUP_SQL,
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
    const { url, anonKey } = body

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

// PATCH /api/settings/supabase - Test connection or get setup SQL
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body as { action?: string }

    if (action === 'test') {
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { ok: false, error: 'Supabase not configured' },
          { status: 400 }
        )
      }

      const result = await testSupabaseDbConnection()

      if (result.ok && result.tablesExist) {
        markSupabaseTablesReady(true)
      }

      return NextResponse.json(result)
    }

    if (action === 'setup') {
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { ok: false, error: 'No active Supabase configuration found' },
          { status: 400 }
        )
      }

      const config = getSupabaseDbConfig()
      const projectRef = config.url.replace('https://', '').replace('.supabase.co', '')
      const sqlEditorLink = `https://supabase.com/dashboard/project/${projectRef}/sql/new`

      const result = await testSupabaseDbConnection()

      if (!result.ok) {
        const errMsg = (result.error || '').toLowerCase()
        const isMissingTableError =
          errMsg.includes('could not find') ||
          errMsg.includes('does not exist') ||
          errMsg.includes('not found') ||
          errMsg.includes('relation') ||
          errMsg.includes('schema cache')

        if (isMissingTableError) {
          markSupabaseTablesReady(false)
          return NextResponse.json({
            ok: true,
            tablesExist: false,
            sql: SUPABASE_SETUP_SQL,
            sqlEditorLink,
          })
        }

        return NextResponse.json({ ok: false, error: result.error, sqlEditorLink })
      }

      if (result.tablesExist) {
        markSupabaseTablesReady(true)
        return NextResponse.json({ ok: true, tablesExist: true, sqlEditorLink })
      }

      markSupabaseTablesReady(false)
      return NextResponse.json({
        ok: true,
        tablesExist: false,
        sql: SUPABASE_SETUP_SQL,
        sqlEditorLink,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error in supabase action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
