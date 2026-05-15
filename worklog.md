---
Task ID: 1
Agent: Main Agent
Task: Move database from SQLite to Supabase PostgreSQL

Work Log:
- Read all existing project files (prisma schema, .env, package.json, all API routes, frontend page)
- Researched Supabase publishable key format via web search
- Created comprehensive Supabase database service (lib/supabase-db.ts) with:
  - Full CRUD operations for all models (Notifications, FilterRules, PushConfigs, PushLogs, AirtableConfig)
  - Snake_case ↔ camelCase converters for Supabase table ↔ app model mapping
  - Config management via local JSON file with in-memory cache
  - Supabase client singleton with dynamic reconfiguration
  - SQL setup script for creating tables in Supabase
  - Graceful fallback to Prisma/SQLite when Supabase is not configured
- Updated all 12 API route files to use the new Supabase database service
- Created missing API routes (airtable/test, supabase/test)
- Updated auto-push module to use the new database service
- Updated frontend (page.tsx) with:
  - Pre-filled publishable key (sb_publishable_a9GeIbcAeBuqx3bHZgHRiw_aXrLd8Ou)
  - Database status indicator in header (Supabase/Local DB)
  - Supabase Database section in Settings with setup SQL display
  - Copy SQL button for table creation
  - Auto-refresh data when switching databases
- Fixed TypeScript errors in API routes
- Fixed fs import issues with Turbopack by using lazy require()

Stage Summary:
- All API routes now use Supabase when configured, falling back to SQLite when not
- Frontend shows database status and provides setup flow for Supabase
- Publishable key is pre-filled in the connection form
- User needs to provide Supabase Project URL and create tables via SQL Editor
- The app currently uses SQLite as fallback and is fully functional
