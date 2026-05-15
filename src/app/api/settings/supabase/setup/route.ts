import { NextResponse } from 'next/server'
import { testSupabaseDbConnection, SUPABASE_SETUP_SQL, isSupabaseConfigured, getSupabaseDbConfig, markSupabaseTablesReady } from '@/lib/supabase-db'

// POST /api/settings/supabase/setup - Check Supabase tables and get SQL setup script
export async function POST() {
  try {
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

    // If the connection test failed, check if it's because tables don't exist
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
          message: 'Tables need to be created in Supabase. Copy the SQL and run it in the Supabase SQL Editor.',
        })
      }

      return NextResponse.json({
        ok: false,
        error: result.error,
        sqlEditorLink,
      })
    }

    if (result.tablesExist) {
      markSupabaseTablesReady(true)

      return NextResponse.json({
        ok: true,
        tablesExist: true,
        sqlEditorLink,
        message: 'All tables are already set up in Supabase!',
      })
    }

    markSupabaseTablesReady(false)

    return NextResponse.json({
      ok: true,
      tablesExist: false,
      sql: SUPABASE_SETUP_SQL,
      sqlEditorLink,
      message: 'Tables need to be created in Supabase. Copy the SQL and run it in the Supabase SQL Editor.',
    })
  } catch (error) {
    console.error('Error setting up supabase tables:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to check Supabase tables' },
      { status: 500 }
    )
  }
}
