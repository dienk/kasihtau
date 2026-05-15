---
Task ID: 2
Agent: Main
Task: Change database to PostgreSQL and move to Airtable

Work Log:
- Attempted to install PostgreSQL: no sudo access, apt install blocked
- Tried embedded-postgres: ICU library version mismatch (needs libicuuc.so.60, have .76)
- Tried PGlite (WASM PostgreSQL): works in-process but TCP server (pglite-socket) has compatibility issues with Prisma
- Prisma's native Rust engine cannot connect to PGlite's TCP server
- Prisma's pg adapter also fails due to internal connection validation
- Reverted to SQLite (the only reliable option in this sandbox)
- Airtable integration remains fully functional - notifications are pushed to Airtable automatically
- Cleaned up unused packages and test files
- Lint passes cleanly

Stage Summary:
- PostgreSQL cannot be used in this sandbox due to: no sudo, no Docker, PGlite TCP server incompatible with Prisma
- SQLite remains the local database, Airtable serves as the external/cloud data store
- All filtered notifications are automatically pushed to Airtable (verified working)
- The app architecture: SQLite (local config/data) + Airtable (cloud notification store + push target)
