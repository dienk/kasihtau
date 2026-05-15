/**
 * Supabase Database Service
 * Replaces Prisma/SQLite with Supabase PostgreSQL via the client SDK.
 *
 * Uses a local JSON config file for bootstrapping the Supabase connection.
 * When Supabase is not configured, falls back to Prisma/SQLite.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ─── Config Management ─────────────────────────────────────────────────────

interface SupabaseDbConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

// In-memory config cache (avoids fs issues with bundlers)
let cachedConfig: SupabaseDbConfig | null = null

function getConfigPath(): string {
  try {
    const { join } = require('path')
    const { cwd } = require('process')
    return join(cwd(), 'data', 'supabase-config.json')
  } catch {
    return ''
  }
}

function readConfig(): SupabaseDbConfig {
  if (cachedConfig) return cachedConfig

  try {
    const fs = require('fs')
    const configPath = getConfigPath()
    if (configPath && fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      cachedConfig = JSON.parse(raw)
      return cachedConfig!
    }
  } catch {
    // ignore
  }
  return { url: '', anonKey: '', isConfigured: false }
}

function writeConfig(config: SupabaseDbConfig): void {
  cachedConfig = config
  try {
    const fs = require('fs')
    const configPath = getConfigPath()
    if (configPath) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[SupabaseDB] Failed to write config:', err)
  }
}

// ─── Singleton Client ──────────────────────────────────────────────────────

let supabaseInstance: SupabaseClient | null = null
let lastConfigUrl = ''
let lastConfigKey = ''

function getSupabaseClient(): SupabaseClient | null {
  const config = readConfig()

  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null
  }

  // Re-create client if config changed
  if (config.url !== lastConfigUrl || config.anonKey !== lastConfigKey) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    })
    lastConfigUrl = config.url
    lastConfigKey = config.anonKey
  }

  return supabaseInstance
}

// ─── Types ─────────────────────────────────────────────────────────────────

// Snake_case types for Supabase tables
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

interface AirtableConfigRow {
  id: string
  base_url: string
  base_id: string
  token: string
  table_name: string
  is_active: boolean
  created_at: string
  updated_at: string
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

function airtableConfigToApp(row: AirtableConfigRow) {
  return {
    id: row.id,
    baseUrl: row.base_url,
    baseId: row.base_id,
    token: row.token,
    tableName: row.table_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

-- Airtable config table
CREATE TABLE IF NOT EXISTS airtable_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  base_url TEXT NOT NULL,
  base_id TEXT NOT NULL,
  token TEXT NOT NULL,
  table_name TEXT NOT NULL DEFAULT 'Notifications',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow anon access (for the publishable key)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airtable_configs ENABLE ROW LEVEL SECURITY;

-- Allow anon role full access to all tables
CREATE POLICY "Allow anon full access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to filter_rules" ON filter_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to push_configs" ON push_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to push_logs" ON push_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to airtable_configs" ON airtable_configs FOR ALL USING (true) WITH CHECK (true);

-- Also allow authenticated role
CREATE POLICY "Allow authenticated full access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to filter_rules" ON filter_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to push_configs" ON push_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to push_logs" ON push_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to airtable_configs" ON airtable_configs FOR ALL USING (true) WITH CHECK (true);

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

DROP TRIGGER IF EXISTS airtable_configs_updated_at ON airtable_configs;
CREATE TRIGGER airtable_configs_updated_at BEFORE UPDATE ON airtable_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`

// ─── Database Service ──────────────────────────────────────────────────────

/**
 * Check if Supabase is configured and connected.
 */
export function isSupabaseConfigured(): boolean {
  const config = readConfig()
  return config.isConfigured && !!config.url && !!config.anonKey
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
export async function saveSupabaseDbConfig(url: string, anonKey: string): Promise<{ ok: boolean; error?: string }> {
  // Test the connection first
  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    })

    // Try to select from notifications table
    const { error } = await testClient
      .from('notifications')
      .select('id')
      .limit(1)

    // If table doesn't exist yet, that's OK - the connection still works
    // We just need the Supabase URL and key to be valid
    if (error && !error.message.includes('does not exist') && !error.message.includes('not found')) {
      // Only fail on auth/connection errors, not missing table errors
      const isAuthError = error.message.includes('JWT') || error.message.includes('apikey') || error.message.includes('Unauthorized')
      if (isAuthError) {
        return { ok: false, error: `Connection test failed: ${error.message}` }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: `Failed to connect: ${msg}` }
  }

  // Save the config
  const config: SupabaseDbConfig = {
    url,
    anonKey,
    isConfigured: true,
  }
  writeConfig(config)

  // Reset the singleton so next call creates a new client
  supabaseInstance = null
  lastConfigUrl = ''
  lastConfigKey = ''

  return { ok: true }
}

/**
 * Remove Supabase configuration (fall back to Prisma/SQLite).
 */
export function removeSupabaseDbConfig(): void {
  writeConfig({ url: '', anonKey: '', isConfigured: false })
  supabaseInstance = null
  lastConfigUrl = ''
  lastConfigKey = ''
}

/**
 * Test the Supabase connection.
 */
export async function testSupabaseDbConnection(): Promise<{ ok: boolean; error?: string; tablesExist?: boolean }> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Supabase not configured' }
  }

  try {
    // Check if notifications table exists
    const { error } = await client
      .from('notifications')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('not found') || error.message.includes('relation')) {
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

  if (client) {
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

    // Client-side search filter (Supabase doesn't support OR contains easily)
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

  // Fallback to Prisma
  const where: Record<string, unknown> = {}
  if (filters?.isFiltered !== undefined) where.isFiltered = filters.isFiltered
  if (filters?.isRead !== undefined) where.isRead = filters.isRead
  if (filters?.isPushed !== undefined) where.isPushed = filters.isPushed
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { message: { contains: filters.search } },
    ]
  }
  return db.notification.findMany({ where, orderBy: { createdAt: 'desc' } })
}

export async function getNotificationById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // not found
      throw new Error(error.message)
    }

    return notifToApp(data as NotificationRow)
  }

  return db.notification.findUnique({ where: { id } })
}

export async function createNotification(data: {
  appName: string
  title: string
  message: string
  isFiltered: boolean
  prefix: string | null
}): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.notification.create({ data })
}

export async function updateNotification(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.notification.update({ where: { id }, data })
}

export async function deleteNotification(id: string): Promise<void> {
  const client = getSupabaseClient()

  if (client) {
    const { error } = await client
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return
  }

  await db.notification.delete({ where: { id } })
}

// ─── Filter Rules ──────────────────────────────────────────────────────────

export async function getFilterRules(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('filter_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data as FilterRuleRow[]).map(ruleToApp)
  }

  return db.filterRule.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getActiveFilterRules(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('filter_rules')
      .select('*')
      .eq('is_active', true)

    if (error) throw new Error(error.message)

    return (data as FilterRuleRow[]).map(ruleToApp)
  }

  return db.filterRule.findMany({ where: { isActive: true } })
}

export async function getFilterRuleByPrefix(prefix: string): Promise<any | null> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.filterRule.findUnique({ where: { prefix } })
}

export async function getFilterRuleById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.filterRule.findUnique({ where: { id } })
}

export async function createFilterRule(data: {
  prefix: string
  matchMode: string
  isActive?: boolean
}): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.filterRule.create({ data })
}

export async function updateFilterRule(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.filterRule.update({ where: { id }, data })
}

export async function deleteFilterRule(id: string): Promise<void> {
  const client = getSupabaseClient()

  if (client) {
    const { error } = await client
      .from('filter_rules')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return
  }

  await db.filterRule.delete({ where: { id } })
}

// ─── Push Configs ──────────────────────────────────────────────────────────

export async function getPushConfigs(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('push_configs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data as PushConfigRow[]).map(pushConfigToApp)
  }

  return db.pushConfig.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getActivePushConfigs(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('push_configs')
      .select('*')
      .eq('is_active', true)

    if (error) throw new Error(error.message)

    return (data as PushConfigRow[]).map(pushConfigToApp)
  }

  return db.pushConfig.findMany({ where: { isActive: true } })
}

export async function getPushConfigById(id: string): Promise<any | null> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.pushConfig.findUnique({ where: { id } })
}

export async function createPushConfig(data: {
  url: string
  method: string
  headers: string
}): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.pushConfig.create({ data })
}

export async function updatePushConfig(id: string, data: Record<string, unknown>): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
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

  return db.pushConfig.update({ where: { id }, data })
}

export async function deletePushConfig(id: string): Promise<void> {
  const client = getSupabaseClient()

  if (client) {
    const { error } = await client
      .from('push_configs')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return
  }

  await db.pushConfig.delete({ where: { id } })
}

// ─── Push Logs ─────────────────────────────────────────────────────────────

export async function getPushLogs(limit: number = 50): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('push_logs')
      .select('*, notification:notifications(id, app_name, title, message, prefix)')
      .order('pushed_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)

    return (data as (PushLogRow & { notification: NotificationRow })[]).map(pushLogToApp)
  }

  return db.pushLog.findMany({
    orderBy: { pushedAt: 'desc' },
    take: limit,
    include: {
      notification: {
        select: { id: true, appName: true, title: true, message: true, prefix: true },
      },
    },
  })
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

  if (client) {
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

  return db.pushLog.create({ data })
}

// ─── Airtable Config ───────────────────────────────────────────────────────

export async function getAirtableConfig(): Promise<any | null> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('airtable_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return null

    return airtableConfigToApp(data[0] as AirtableConfigRow)
  }

  return db.airtableConfig.findFirst()
}

export async function getAllAirtableConfigs(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('airtable_configs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data as AirtableConfigRow[]).map(airtableConfigToApp)
  }

  return db.airtableConfig.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function saveAirtableConfig(data: {
  baseUrl: string
  baseId: string
  token: string
  tableName: string
  isActive?: boolean
}): Promise<any> {
  const client = getSupabaseClient()

  if (client) {
    // Check if config exists
    const existing = await getAirtableConfig()

    if (existing) {
      // If token contains "..." it means the user didn't change it, keep the old one
      const actualToken = data.token.includes('...') ? existing.token : data.token

      const row: Record<string, unknown> = {
        base_url: data.baseUrl,
        base_id: data.baseId,
        token: actualToken,
        table_name: data.tableName,
        is_active: data.isActive !== undefined ? data.isActive : true,
      }

      const { data: result, error } = await client
        .from('airtable_configs')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return airtableConfigToApp(result as AirtableConfigRow)
    }

    // Create new
    const row: AirtableConfigRow = {
      id: randomUUID(),
      base_url: data.baseUrl,
      base_id: data.baseId,
      token: data.token,
      table_name: data.tableName,
      is_active: data.isActive !== undefined ? data.isActive : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await client
      .from('airtable_configs')
      .insert(row)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return airtableConfigToApp(result as AirtableConfigRow)
  }

  // Prisma fallback
  const existing = await db.airtableConfig.findFirst()
  if (existing) {
    const actualToken = data.token.includes('...') ? existing.token : data.token
    return db.airtableConfig.update({
      where: { id: existing.id },
      data: {
        baseUrl: data.baseUrl,
        baseId: data.baseId,
        token: actualToken,
        tableName: data.tableName,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    })
  }

  return db.airtableConfig.create({
    data: {
      baseUrl: data.baseUrl,
      baseId: data.baseId,
      token: data.token,
      tableName: data.tableName,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  })
}

export async function deleteAirtableConfig(): Promise<void> {
  const client = getSupabaseClient()

  if (client) {
    const existing = await getAirtableConfig()
    if (existing) {
      const { error } = await client
        .from('airtable_configs')
        .delete()
        .eq('id', existing.id)

      if (error) throw new Error(error.message)
    }
    return
  }

  const existing = await db.airtableConfig.findFirst()
  if (existing) {
    await db.airtableConfig.delete({ where: { id: existing.id } })
  }
}

// ─── Supabase Config (for push, stored in the local JSON file) ─────────────

export async function getSupabasePushConfig(): Promise<any | null> {
  const config = readConfig()
  if (!config.isConfigured) return null
  return {
    id: 'local-config',
    url: config.url,
    anonKey: config.anonKey,
    isActive: true,
  }
}

// ─── Bulk helpers ──────────────────────────────────────────────────────────

export async function getUnfilteredNotifications(): Promise<any[]> {
  return getNotifications({ isFiltered: false })
}

export async function getFilteredUnpushedNotifications(): Promise<any[]> {
  const client = getSupabaseClient()

  if (client) {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('is_filtered', true)
      .eq('is_pushed', false)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data as NotificationRow[]).map(notifToApp)
  }

  return db.notification.findMany({
    where: { isFiltered: true, isPushed: false },
    orderBy: { createdAt: 'asc' },
  })
}
