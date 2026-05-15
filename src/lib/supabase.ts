/**
 * Supabase integration helper.
 * Pushes filtered notification records to a Supabase project.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupabaseConfigLike {
  url: string
  anonKey: string
}

export interface SupabaseNotificationRecord {
  id: string
  app_name: string
  title: string
  message: string
  prefix: string | null
  is_read: boolean
  is_filtered: boolean
  is_pushed: boolean
  push_status: string
  created_at: string
  updated_at: string
}

export interface SupabasePushResult {
  success: boolean
  recordId?: string
  error?: string
}

const TABLE_NAME = 'Notifications'

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Create and return a typed Supabase client.
 */
export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

// ─── Push ────────────────────────────────────────────────────────────────────

/**
 * Push a notification record to Supabase.
 */
export async function pushToSupabase(
  config: SupabaseConfigLike,
  record: SupabaseNotificationRecord
): Promise<SupabasePushResult> {
  try {
    const supabase = getSupabaseClient(config.url, config.anonKey)

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(record, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: `Supabase error: ${error.message}` }
    }

    return { success: true, recordId: data?.id as string }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// ─── Test Connection ─────────────────────────────────────────────────────────

/**
 * Test the Supabase connection by querying the Notifications table (limit 1).
 */
export async function testSupabaseConnection(
  config: SupabaseConfigLike
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient(config.url, config.anonKey)

    // Try to select from the table with a limit of 1
    const { error } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .limit(1)

    if (error) {
      // If the table doesn't exist, we get a specific error
      return { ok: false, error: `Supabase error: ${error.message}` }
    }

    return { ok: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: errorMessage }
  }
}

// ─── Create / Setup Tables ───────────────────────────────────────────────────

/**
 * Try to set up the Supabase Notifications table by inserting a test record
 * and immediately deleting it. This creates the table structure if the table
 * already exists but is empty, or verifies the table is accessible.
 *
 * Note: Supabase tables must be created via the dashboard or migrations.
 * This function verifies the table is accessible and writable.
 */
export async function createSupabaseTables(
  config: SupabaseConfigLike
): Promise<{ ok: boolean; error?: string; tableCreated?: boolean }> {
  try {
    const supabase = getSupabaseClient(config.url, config.anonKey)

    // First, check if the table exists by trying to select from it
    const { error: selectError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .limit(1)

    if (selectError) {
      return {
        ok: false,
        tableCreated: false,
        error: `Table "${TABLE_NAME}" does not exist or is not accessible. Please create it in the Supabase dashboard with the following columns:\n\n` +
          `  - id (text, Primary Key)\n` +
          `  - app_name (text)\n` +
          `  - title (text)\n` +
          `  - message (text)\n` +
          `  - prefix (text, nullable)\n` +
          `  - is_read (boolean)\n` +
          `  - is_filtered (boolean)\n` +
          `  - is_pushed (boolean)\n` +
          `  - push_status (text)\n` +
          `  - created_at (timestamptz)\n` +
          `  - updated_at (timestamptz)\n\n` +
          `Original error: ${selectError.message}`,
      }
    }

    // Table exists - try inserting a test record and deleting it
    const testId = `__test_${Date.now()}`
    const testRecord: SupabaseNotificationRecord = {
      id: testId,
      app_name: '__test__',
      title: 'Connection Test',
      message: 'This is a test record',
      prefix: null,
      is_read: false,
      is_filtered: false,
      is_pushed: false,
      push_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(testRecord)

    if (insertError) {
      return {
        ok: false,
        tableCreated: false,
        error: `Table exists but insert failed: ${insertError.message}. ` +
          `Make sure the table has the correct columns and RLS policies allow inserts with the anon key.`,
      }
    }

    // Delete the test record
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', testId)

    if (deleteError) {
      // Not critical - the test record is there but we couldn't delete it
      console.warn('[Supabase] Could not delete test record:', deleteError.message)
    }

    return { ok: true, tableCreated: false }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, tableCreated: false, error: errorMessage }
  }
}
