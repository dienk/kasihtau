import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase-db'

// GET /api/settings/supabase - Get Supabase database status
export async function GET() {
  const configured = isSupabaseConfigured()

  return NextResponse.json({
    isConfigured: configured,
    tablesReady: configured,
  })
}
