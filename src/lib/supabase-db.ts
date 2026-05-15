/**
 * Supabase Database Service
 * Uses Supabase PostgreSQL as the ONLY database via the client SDK.
 * Configuration is loaded from environment variables.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ─── Config Management ─────────────────────────────────────────────────────

interface SupabaseDbConfig {
  url: string
  anonKey: string
  isConfigured: boolean
  tablesReady: boolean
}

// In-memory config cache (no file system dependency)
let cachedConfig: SupabaseDbConfig | null = null

function readConfig(): SupabaseDbConfig {
  if (cachedConfig) return cachedConfig

  // Read from environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (envUrl && envKey) {
    const config: SupabaseDbConfig = {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      tablesReady: true,
    }
    cachedConfig = config
    return config
  }

  return { url: '', anonKey: '', isConfigured: false, tablesReady: false }
}

function writeConfig(config: SupabaseDbConfig): void {
  cachedConfig = config
}

// ─── Singleton Client ──────────────────────────────────────────────────────

let supabaseInstance: SupabaseClient | null = null
let lastConfigUrl = ''
let lastConfigKey = ''

function getSupabaseClient(): SupabaseClient {
  const config = readConfig()

  // Re-create client if config changed
  if (!supabaseInstance || config.url !== lastConfigUrl || config.anonKey !== lastConfigKey) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    })
    lastConfigUrl = config.url
    lastConfigKey = config.anonKey
  }

  return supabaseInstance
}

/**
 * Get Supabase client even if tables aren't ready yet.
 * Used by setup/verify endpoints.
 */
function getSupabaseClientRaw(): SupabaseClient | null {
  const config = readConfig()
  if (!config.url || !config.anonKey) return null
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  })
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface NotificationRow {
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

interface FilterRuleRow {
  id: string
  prefix: string
  match_mode: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PushConfigRow {
  id: string
  url: string
  method: string
  headers: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PushLogRow {
  id: string
  notification_id: string
  push_config_id: string | null
  status: string
  request_body: string
  response_status: number | null
  response_body: string | null
  error_message: string | null
  pushed_at: string
}

// ─── Converters (Supabase snake_case ↔ App camelCase) ──────────────────────

function notifToApp(row: NotificationRow) {
  return {
    id: row.id,
    appName: row.app_name,
    title: row.title,
    message: row.message,
    prefix: row.prefix,
    isRead: row.is_read,
    isFiltered: row.is_filtered,
    isPushed: row.is_pushed,
    pushStatus: row.push_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ruleToApp(row: FilterRuleRow) {
  return {
    id: row.id,
    prefix: row.prefix,
    matchMode: row.match_mode,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function pushConfigToApp(row: PushConfigRow) {
  return {
    id: row.id,
    url: row.url,
    method: row.method,
    headers: row.headers,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function pushLogToApp(row: PushLogRow & { notification?: NotificationRow }) {
  return {
    id: row.id,
    notificationId: row.notification_id,
    pushConfigId: row.push_config_id,
    status: row.status,
    requestBody: row.request_body,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    errorMessage: row.error_message,
    pushedAt: row.pushed_at,
    notification: row.notification ? {
      id: row.notification.id,
      appName: row.notification.app_name,
      title: row.notification.title,
      message: row.notification.message,
      prefix: row.notification.prefix,
    } : undefined,
  }
}

// ─── SQL for Table Creation ────────────────────────────────────────────────

export const SUPABASE_SETUP_SQL = `
-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  app_name TEXT NOT NULL DEFAULT 'Unknown',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  prefix TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_filtered BOOLEAN NOT NULL DEFAULT false,
  is_pushed BOOLEAN NOT NULL DEFAULT false,
  push_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filter rules table
CREATE TABLE IF NOT EXISTS filter_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prefix TEXT NOT NULL UNIQUE,
  match_mode TEXT NOT NULL DEFAULT 'contains',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push configs table
CREATE TABLE IF NOT EXISTS push_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  headers TEXT NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push logs table
CREATE TABLE IF NOT EXISTS push_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  push_config_id TEXT REFERENCES push_configs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_body TEXT NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow anon access (for the publishable key)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon role full access to all tables
CREATE POLICY "Allow anon full access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to filter_rules" ON filter_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to push_configs" ON push_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to push_logs" ON push_logs FOR ALL USING (true) WITH CHECK (true);

-- Also allow authenticated role
CREATE POLICY "Allow authenticated full access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to filter_rules" ON filter_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to push_configs" ON push_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to push_logs" ON push_logs FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS filter_rules_updated_at ON filter_rules;
CREATE TRIGGER filter_rules_updated_at BEFORE UPDATE ON filter_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS push_configs_updated_at ON push_configs;
CREATE TRIGGER push_configs_updated_at BEFORE UPDATE ON push_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`

// ─── Database Status ───────────────────────────────────────────────────────

/**
 * Check if Supabase is configured (URL + key available).
 */
export function isSupabaseConfigured(): boolean {
  const config = readConfig()
  return config.isConfigured && !!config.url && !!config.anonKey
}

/**
 * Check if Supabase is fully ready (configured + tables exist).
 */
export function isSupabaseReady(): boolean {
  const config = readConfig()
  return config.isConfigured && !!config.url && !!config.anonKey && config.tablesReady
}

/**
 * Get the current Supabase configuration.
 */
export function getSupabaseDbConfig(): SupabaseDbConfig {
  return readConfig()
}

/**
 * Save Supabase configuration and test the connection.
 */
export async function saveSupabaseDbConfig(url: string, anonKey: string): Promise<{ ok: boolean; error?: string; tablesReady?: boolean }> {
  let tablesReady = false
  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    })

    const { error } = await testClient
      .from('notifications')
      .select('id')
      .limit(1)

    if (error) {
      const isMissingTable =
        error.message.includes('does not exist') ||
        error.message.includes('not found') ||
        error.message.includes('schema cache') ||
        error.message.includes('relation') ||
        error.code === 'PGRST205'

      const isAuthError = error.message.includes('JWT') || error.message.includes('apikey') || error.message.includes('Unauthorized')
      if (isAuthError) {
        return { ok: false, error: `Connection test failed: ${error.message}` }
      }
      if (!isMissingTable) {
        console.warn('[SupabaseDB] Non-critical error during save:', error.message)
      }
    } else {
      tablesReady = true
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: `Failed to connect: ${msg}` }
  }

  const config: SupabaseDbConfig = {
    url,
    anonKey,
    isConfigured: true,
    tablesReady,
  }
  writeConfig(config)
  supabaseInstance = null
  lastConfigUrl = ''
  lastConfigKey = ''

  return { ok: true, tablesReady }
}

/**
 * Remove Supabase configuration.
 */
export function removeSupabaseDbConfig(): void {
  writeConfig({ url: '', anonKey: '', isConfigured: false, tablesReady: false })
  supabaseInstance = null
  lastConfigUrl = ''
  lastConfigKey = ''
}

/**
 * Mark Supabase tables as ready.
 */
export function markSupabaseTablesReady(ready: boolean): void {
  const config = readConfig()
  config.tablesReady = ready
  writeConfig(config)
  supabaseInstance = null
  lastConfigUrl = ''
  lastConfigKey = ''
}

/**
 * Test the Supabase connection.
 */
export async function testSupabaseDbConnection(): Promise<{ ok: boolean; error?: string; tablesExist?: boolean }> {
  const client = getSupabaseClientRaw()
  if (!client) {
    return { ok: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await client
      .from('notifications')
      .select('id')
      .limit(1)

    if (error) {
      const isMissingTable =
        error.message.includes('does not exist') ||
        error.message.includes('not found') ||
        error.message.includes('relation') ||
        error.message.includes('schema cache') ||
        error.code === 'PGRST205'

      if (isMissingTable) {
        return { ok: true, tablesExist: false }
      }
      return { ok: false, error: error.message, tablesExist: false }
    }

    return { ok: true, tablesExist: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}

// ─── Notifications ─────────────────────────────────────────────────────────

export async function getNotifications(filters?: {
  isFiltered?: boolean
  isRead?: boolean
  isPushed?: boolean
  search?: string
}): Promise<any[]> {
  const client = getSupabaseClient()

  let query = client
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.isFiltered !== undefined) query = query.eq('is_filtered', filters.isFiltered)
  if (filters?.isRead !== undefined) query = query.eq('is_read', filters.isRead)
  if (filters?.isPushed !== undefined) query = query.eq('is_pushed', filters.isPushed)

  const { data, error } = await query

  if (error) {
    console.error('[SupabaseDB] Error fetching notifications:', error)
    throw new Error(error.message)
  }

  let results = (data as NotificationRow[]).map(notifToApp)

  // Client-side search filter
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    results = results.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.appName.toLowerCase().includes(q)
    )
  }

  return results
}

export async function getNotificationById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return notifToApp(data as NotificationRow)
}

export async function createNotification(data: {
  appName: string
  title: string
  message: string
  isFiltered: boolean
  prefix: string | null
}): Promise<any> {
  const client = getSupabaseClient()

  const row: NotificationRow = {
    id: randomUUID(),
    app_name: data.appName || 'Unknown',
    title: data.title,
    message: data.message,
    prefix: data.prefix,
    is_read: false,
    is_filtered: data.isFiltered,
    is_pushed: false,
    push_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: result, error } = await client
    .from('notifications')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return notifToApp(result as NotificationRow)
}

export async function updateNotification(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  const row: Record<string, unknown> = {}

  if (data.isRead !== undefined) row.is_read = data.isRead
  if (data.isFiltered !== undefined) row.is_filtered = data.isFiltered
  if (data.isPushed !== undefined) row.is_pushed = data.isPushed
  if (data.pushStatus !== undefined) row.push_status = data.pushStatus
  if (data.prefix !== undefined) row.prefix = data.prefix

  const { data: result, error } = await client
    .from('notifications')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return notifToApp(result as NotificationRow)
}

export async function deleteNotification(id: string): Promise<void> {
  const client = getSupabaseClient()

  const { error } = await client
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteAllNotifications(): Promise<number> {
  const client = getSupabaseClient()

  // Delete push logs first (they reference notifications via FK)
  const { error: logError } = await client
    .from('push_logs')
    .delete()
    .neq('id', '') // delete all rows

  if (logError) {
    console.warn('[SupabaseDB] Error clearing push logs:', logError.message)
  }

  // Delete all notifications
  const { data, error } = await client
    .from('notifications')
    .delete()
    .neq('id', '') // delete all rows
    .select('id')

  if (error) throw new Error(error.message)

  return data?.length ?? 0
}

// ─── Filter Rules ──────────────────────────────────────────────────────────

export async function getFilterRules(): Promise<any[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('filter_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data as FilterRuleRow[]).map(ruleToApp)
}

export async function getActiveFilterRules(): Promise<any[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('filter_rules')
    .select('*')
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  return (data as FilterRuleRow[]).map(ruleToApp)
}

export async function getFilterRuleByPrefix(prefix: string): Promise<any | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('filter_rules')
    .select('*')
    .eq('prefix', prefix)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return ruleToApp(data as FilterRuleRow)
}

export async function getFilterRuleById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('filter_rules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return ruleToApp(data as FilterRuleRow)
}

export async function createFilterRule(data: {
  prefix: string
  matchMode: string
  isActive?: boolean
}): Promise<any> {
  const client = getSupabaseClient()

  const row: FilterRuleRow = {
    id: randomUUID(),
    prefix: data.prefix,
    match_mode: data.matchMode,
    is_active: data.isActive !== undefined ? data.isActive : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: result, error } = await client
    .from('filter_rules')
    .insert(row)
    .select()
    .single()

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new Error('DUPLICATE_PREFIX')
    }
    throw new Error(error.message)
  }

  return ruleToApp(result as FilterRuleRow)
}

export async function updateFilterRule(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  const row: Record<string, unknown> = {}

  if (data.prefix !== undefined) row.prefix = data.prefix
  if (data.matchMode !== undefined) row.match_mode = data.matchMode
  if (data.isActive !== undefined) row.is_active = data.isActive

  const { data: result, error } = await client
    .from('filter_rules')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new Error('DUPLICATE_PREFIX')
    }
    throw new Error(error.message)
  }

  return ruleToApp(result as FilterRuleRow)
}

export async function deleteFilterRule(id: string): Promise<void> {
  const client = getSupabaseClient()

  const { error } = await client
    .from('filter_rules')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─── Push Configs ──────────────────────────────────────────────────────────

export async function getPushConfigs(): Promise<any[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('push_configs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data as PushConfigRow[]).map(pushConfigToApp)
}

export async function getActivePushConfigs(): Promise<any[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('push_configs')
    .select('*')
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  return (data as PushConfigRow[]).map(pushConfigToApp)
}

export async function getPushConfigById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('push_configs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return pushConfigToApp(data as PushConfigRow)
}

export async function createPushConfig(data: {
  url: string
  method: string
  headers: string
}): Promise<any> {
  const client = getSupabaseClient()

  const row: PushConfigRow = {
    id: randomUUID(),
    url: data.url,
    method: data.method || 'POST',
    headers: data.headers || '{}',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: result, error } = await client
    .from('push_configs')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return pushConfigToApp(result as PushConfigRow)
}

export async function updatePushConfig(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  const row: Record<string, unknown> = {}

  if (data.url !== undefined) row.url = data.url
  if (data.method !== undefined) row.method = data.method
  if (data.headers !== undefined) {
    row.headers = typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers)
  }
  if (data.isActive !== undefined) row.is_active = data.isActive

  const { data: result, error } = await client
    .from('push_configs')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return pushConfigToApp(result as PushConfigRow)
}

export async function deletePushConfig(id: string): Promise<void> {
  const client = getSupabaseClient()

  const { error } = await client
    .from('push_configs')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─── Push Logs ─────────────────────────────────────────────────────────────

export async function getPushLogs(limit: number = 50): Promise<any[]> {
  const client = getSupabaseClient()

  try {
    const { data, error } = await client
      .from('push_logs')
      .select('*, notification:notifications(id, app_name, title, message, prefix)')
      .order('pushed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[SupabaseDB] Push logs join failed, trying simple query:', error.message)
      const { data: simpleData, error: simpleError } = await client
        .from('push_logs')
        .select('*')
        .order('pushed_at', { ascending: false })
        .limit(limit)

      if (simpleError) throw new Error(simpleError.message)
      return (simpleData as PushLogRow[]).map(pushLogToApp)
    }

    return (data as (PushLogRow & { notification: NotificationRow })[]).map(pushLogToApp)
  } catch (err) {
    console.error('[SupabaseDB] Error fetching push logs:', err)
    return []
  }
}

export async function createPushLog(data: {
  notificationId: string
  pushConfigId?: string | null
  status: string
  requestBody: string
  responseStatus?: number | null
  responseBody?: string | null
  errorMessage?: string | null
}): Promise<any> {
  const client = getSupabaseClient()

  const row: PushLogRow = {
    id: randomUUID(),
    notification_id: data.notificationId,
    push_config_id: data.pushConfigId ?? null,
    status: data.status,
    request_body: data.requestBody || '{}',
    response_status: data.responseStatus ?? null,
    response_body: data.responseBody ?? null,
    error_message: data.errorMessage ?? null,
    pushed_at: new Date().toISOString(),
  }

  const { data: result, error } = await client
    .from('push_logs')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return pushLogToApp(result as PushLogRow)
}

// ─── Bulk helpers ──────────────────────────────────────────────────────────

export async function getUnfilteredNotifications(): Promise<any[]> {
  return getNotifications({ isFiltered: false })
}

export async function getFilteredUnpushedNotifications(): Promise<any[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('is_filtered', true)
    .eq('is_pushed', false)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return (data as NotificationRow[]).map(notifToApp)
}
