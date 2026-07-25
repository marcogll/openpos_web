# Changelog

## v1.2.0 - 2026-07-25

### Features

- Added a GHCR CI/CD workflow that builds Docker images for pull requests and publishes images on `main`, release events, and version tags.
- Published Docker image tags for `latest`, branch refs, semantic versions, and commit SHA refs.
- Added a production Docker web image for the POS web app on port `3001`.
- Added a KPI dashboard with at-a-glance sales, cash flow, inventory health, low-stock alerts, top sellers, rotation, hourly sales, and category charts.
- Added inventory views and endpoints for dashboard, stock list, low-stock materials, movements, entries, adjustments, and physical counts.
- Added client management routes and UI, including fictitious academy/store seed clients.
- Added client import/export tools under Settings instead of duplicating the client list.
- Added product import/export tools under Settings instead of duplicating the product list.
- Added web seed data for beauty academy/store operations, including products, sales, inventory movements, clients, and users.
- Added `owner-admin` role support and seeded Ale Ponce as owner admin.
- Added receipt, Telegram, barcode scanner, appearance, API reference, and branding configuration screens.
- Improved POS layout responsiveness for desktop and mobile navigation.

### Fixes

- Fixed settings/client/product views that could crash with `Cannot read properties of undefined (reading 'toLowerCase')`.
- Fixed inconsistent client API field names by normalizing responses to frontend-friendly camelCase.
- Fixed KPI product reports that were using an invalid query path.
- Fixed ambiguous SQL references in KPI/report routes.
- Fixed Docker runtime missing server/shared source files.
- Fixed Docker build context problems caused by nested `node_modules`.
- Fixed Docker server double-start caused by Bun auto-serving the default export.
- Fixed Docker web port alignment to keep the existing `3001` route stable.
- Fixed UI overflow and tap targets across POS, cart, product grid, sidebar, header, toasts, and KPI charts.
