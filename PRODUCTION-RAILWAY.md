# CemilIn production on Railway

This repository is configured to run the React frontend and Express API from one Railway service.

## App service variables

Set these on the CemilIn application service:

- `NODE_ENV=production`
- `DB_HOST=${{MySQL.MYSQLHOST}}`
- `DB_PORT=${{MySQL.MYSQLPORT}}`
- `DB_USER=${{MySQL.MYSQLUSER}}`
- `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
- `DB_NAME=${{MySQL.MYSQLDATABASE}}`
- `JWT_SECRET=<long random secret, minimum 32 characters>`
- `COOKIE_SECURE=true`
- `FRONTEND_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}`

Optional one-time admin variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (minimum 12 characters)
- `ADMIN_NAME`

## Persistent uploads

Attach one Railway Volume to the app service and mount it at:

`/app/backend/uploads`

This preserves product images, QRIS and payment proof uploads across deployments.

## Database preparation

`railway.json` runs `node backend/scripts/prepare-production.js` before deploy. It creates the base tables, seeds the catalog only when `products` is empty, then runs all additive migrations through Accounting V26 and Purchase Costing V27. Existing products/stocks are not re-seeded on later deploys.

## First admin

After the first successful deployment and after `ADMIN_*` variables are set, run the one-time admin command from a Railway shell/CLI:

`npm run admin --prefix backend`

Then remove `ADMIN_PASSWORD` from service variables.
