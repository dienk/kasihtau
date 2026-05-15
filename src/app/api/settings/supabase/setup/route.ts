import { NextResponse } from 'next/server'
import { testSupabaseDbConnection, SUPABASE_SETUP_SQL, isSupabaseConfigured } from '@/lib/supabase-db'

// POST /api/settings/supabase/setup - Get SQL setup script for Supabase tables
export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'No active Supabase configuration found' },
        { status: 400 }
      )
    }

    const result = await testSupabaseDbConnection()

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error,
      })
    }

    if (result.tablesExist) {
      return NextResponse.json({
        ok: true,
        tablesExist: true,
        message: 'All tables are already set up in Supabase!',
      })
    }

    // Return the SQL for the user to run in Supabase SQL Editor
    return NextResponse.json({
      ok: true,
      tablesExist: false,
      message: 'Tables need to be created in Supabase. Run the SQL below in your Supabase SQL Editor.',
      sql: SUPABASE_SETUP_SQL,
    })
  } catch (error) {
    console.error('Error setting up supabase tables:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to check Supabase tables' },
      { status: 500 }
    )
  }
}
