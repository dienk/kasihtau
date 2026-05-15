import { db } from '@/lib/db'
import { createSupabaseTables } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST /api/settings/supabase/setup - Set up the Supabase tables by verifying accessibility
// and inserting a test record then deleting it
export async function POST() {
  try {
    const config = await db.supabaseConfig.findFirst({
      where: { isActive: true },
    })

    if (!config) {
      return NextResponse.json(
        { ok: false, error: 'No active Supabase configuration found' },
        { status: 400 }
      )
    }

    const result = await createSupabaseTables({
      url: config.url,
      anonKey: config.anonKey,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error setting up supabase tables:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to set up Supabase tables' },
      { status: 500 }
    )
  }
}
