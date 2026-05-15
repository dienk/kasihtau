# Task 1: Supabase Database Setup System

## Summary
Implemented a comprehensive Supabase database setup system for the kasihtau notification filtering/pushing app, enabling users to create required tables in their Supabase PostgreSQL database via the UI.

## Changes Made

### 1. New API: `src/app/api/settings/supabase/create-tables/route.ts`
- **POST endpoint** that accepts an optional `serviceRoleKey` or `dbPassword` in the request body
- First checks if tables already exist via `testSupabaseDbConnection()`
- If `serviceRoleKey` is provided, attempts to create tables via Supabase Management API
- If `dbPassword` is provided, tries direct PostgreSQL connection
- If automatic methods fail, returns the SQL for manual execution
- Returns `{ ok, tablesCreated, sql?, sqlEditorLink, message }`

### 2. Updated API: `src/app/api/settings/supabase/setup/route.ts`
- Added `sqlEditorLink` to all responses
- Added smart error detection for missing tables
- Now uses `markSupabaseTablesReady()` to track table readiness

### 3. Updated API: `src/app/api/settings/supabase/test/route.ts`
- Now uses `markSupabaseTablesReady()` to track table readiness
- Updates `tablesReady` flag based on test results

### 4. Updated API: `src/app/api/settings/supabase/route.ts`
- Now returns `tablesReady` flag in GET response
- Handles `tablesReady` in POST response

### 5. Updated Core: `src/lib/supabase-db.ts`
- Added `tablesReady` field to `SupabaseDbConfig` interface
- `getSupabaseClient()` now requires `tablesReady: true` to use Supabase
- Added `getSupabaseClientRaw()` for setup/verify operations (bypasses tablesReady check)
- Added `markSupabaseTablesReady()` function
- Added `isSupabaseReady()` function
- `saveSupabaseDbConfig()` now checks table existence and sets `tablesReady`
- `testSupabaseDbConnection()` now uses `getSupabaseClientRaw()` to bypass tablesReady check
- Better error detection for missing tables (PGRST205, "schema cache" errors)

### 6. Updated Frontend: `src/app/page.tsx`
- Updated `fetchSupabaseConfig` to handle `tablesReady` flag
- Updated `handleSaveSupabase` to check `tablesReady` in response
- Updated `handleVerifySupabaseTables` to update `dbStatus` and refresh data
- Default anon key updated to new key
- Full setup UI with banners, collapsible SQL, verify button, SQL Editor link

### 7. Configuration Updates
- `.env`: Updated with new Supabase URL and publishable key
- `data/supabase-config.json`: Updated with new credentials, `tablesReady: false`

## Testing
- App works correctly with SQLite fallback when Supabase tables don't exist
- Supabase config API returns `tablesReady: false`
- Notifications, filter rules, push configs, and push logs all work via Prisma/SQLite
- Simulate endpoint creates test notifications successfully
- Lint passes with no errors
