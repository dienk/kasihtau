---
Task ID: 1
Agent: Main
Task: Connect app to Airtable (https://airtable.com/appS02vV9NX6QERC7)

Work Log:
- Validated Airtable PAT token via /v0/meta/whoami endpoint
- Created "Notifications" table in Airtable base with fields: AppName, Title, Message, Prefix, FilteredAt, Timestamp, NotifId
- Tested inserting records to Airtable - confirmed working
- Added AirtableConfig model to Prisma schema
- Created /src/lib/airtable.ts with pushToAirtable() and testAirtableConnection() functions
- Created /src/app/api/settings/airtable/route.ts (GET, POST, DELETE for config CRUD)
- Created /src/app/api/settings/airtable/test/route.ts (POST for connection test)
- Updated /src/lib/auto-push.ts to also push to Airtable when configured
- Seeded Airtable config in database (baseId: appS02vV9NX6QERC7, table: Notifications)
- Updated frontend page.tsx with Airtable Integration section in Settings tab
- Tested end-to-end: Created notification with [URGENT] prefix → auto-filtered → auto-pushed to Airtable (success)

Stage Summary:
- Airtable integration fully functional
- Filtered notifications automatically push to Airtable as new records
- UI shows Airtable connection status with Test/Connect/Update/Delete controls
- Push logs track both webhook and Airtable push results
