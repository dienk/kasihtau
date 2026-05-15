import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_SETUP_SQL, isSupabaseConfigured, testSupabaseDbConnection, getSupabaseDbConfig, markSupabaseTablesReady } from '@/lib/supabase-db'

// POST /api/settings/supabase/create-tables - Create tables in Supabase
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'No active Supabase configuration found' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { serviceRoleKey, dbPassword } = body as { serviceRoleKey?: string; dbPassword?: string }

    const config = getSupabaseDbConfig()
    const projectRef = config.url.replace('https://', '').replace('.supabase.co', '')

    // First, check if tables already exist
    const connectionTest = await testSupabaseDbConnection()
    if (connectionTest.ok && connectionTest.tablesExist) {
      markSupabaseTablesReady(true)
      return NextResponse.json({
        ok: true,
        tablesCreated: true,
        message: 'All tables already exist in Supabase!',
      })
    }

    // Strategy 1: Try Supabase Management API with service role key
    if (serviceRoleKey) {
      try {
        const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            query: SUPABASE_SETUP_SQL,
          }),
        })

        if (mgmtResponse.ok) {
          // Wait for tables to be created
          await new Promise(resolve => setTimeout(resolve, 2000))

          const verifyResult = await testSupabaseDbConnection()
          if (verifyResult.ok && verifyResult.tablesExist) {
            markSupabaseTablesReady(true)
            return NextResponse.json({
              ok: true,
              tablesCreated: true,
              message: 'Tables created successfully via Supabase Management API!',
            })
          }
        }
      } catch (apiError) {
        console.error('[CreateTables] Management API attempt failed:', apiError)
      }
    }

    // Strategy 2: Try direct PostgreSQL connection with password
    if (dbPassword) {
      try {
        // Try common Supabase regions
        const regions = ['ap-southeast-1', 'us-east-1', 'eu-west-1', 'us-west-1', 'ap-northeast-1']

        for (const region of regions) {
          const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:6543/postgres`

          try {
            // Use dynamic import to avoid bundling pg
            const { PrismaClient } = await import('@prisma/client')
            const testPrisma = new PrismaClient({
              datasourceUrl: connectionString,
            })

            // Try a simple query to test the connection
            await testPrisma.$queryRaw`SELECT 1`

            // If connection works, we can't actually create tables with Prisma
            // because the schema is SQLite-specific. Instead, we'll use raw SQL.
            // But Prisma doesn't support DDL through $executeRaw for creating tables
            // with the correct structure. So let's just use the connection to
            // execute the SQL directly.

            await testPrisma.$disconnect()

            // If we got here, the connection works but we need DDL
            // Let's try using the Supabase SQL API with the connection
            break
          } catch (connErr) {
            // Connection failed for this region, try next
            continue
          }
        }
      } catch (pgError) {
        console.error('[CreateTables] PostgreSQL connection attempt failed:', pgError)
      }
    }

    // Cannot create tables automatically — return the SQL for manual execution
    const sqlEditorLink = `https://supabase.com/dashboard/project/${projectRef}/sql/new`

    return NextResponse.json({
      ok: true,
      tablesCreated: false,
      sql: SUPABASE_SETUP_SQL,
      sqlEditorLink,
      message: serviceRoleKey || dbPassword
        ? 'Could not create tables via API. Please run the SQL manually in the Supabase SQL Editor.'
        : 'Provide a service role key or database password to create tables automatically, or run the SQL manually in the Supabase SQL Editor.',
    })
  } catch (error) {
    console.error('Error creating supabase tables:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create Supabase tables' },
      { status: 500 }
    )
  }
}
