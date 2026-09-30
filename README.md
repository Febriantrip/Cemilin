# CemilIn

<p align="center">
  <strong>Full-stack snack e-commerce platform with customer storefront, Seller Center, stock reservation, manual payment verification, accounting, and Railway deployment.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=fff" alt="Node.js + Express">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=fff" alt="MySQL">
  <img src="https://img.shields.io/badge/Railway-Deployment-0B0D0E?logo=railway&logoColor=fff" alt="Railway">
</p>

## Overview

**CemilIn** is a full-stack e-commerce system built for a snack business. It combines a responsive customer storefront with an operational **Seller Center** for product, stock, order, payment, store-setting, and accounting workflows.

The application is designed around real transaction flow rather than catalog-only browsing. Stock is reserved during checkout, manual payment evidence moves through review, order-status transitions are validated, cancelled or expired unpaid orders can restore stock, and paid sales can feed the accounting layer.

## Product areas

| Area | Responsibility |
| --- | --- |
| **Storefront** | Product browsing, account access, cart, checkout, and customer orders |
| **Seller Center** | Dashboard, product maintenance, stock, order handling, and store settings |
| **Cart & Pricing** | Quantity validation, variant switching, notes, promotional pricing, shipping |
| **Order Workflow** | Checkout, payment review, preparation, fulfillment, completion, cancellation |
| **Payments** | Static QRIS / bank transfer with manual seller verification |
| **Inventory** | Checkout-time stock reservation and controlled stock restoration |
| **Purchasing** | Supplier purchases and purchase-cost allocation |
| **Accounting** | Accounts, journals, cash/bank, purchases, ledger, financial statements |
| **Deployment** | Single-origin React + Express deployment on Railway with MySQL |

## Core capabilities

- Customer registration and authenticated shopping
- Product catalog with PCS and KG units
- Cart-level notes and product notes
- Product-variant switching with stock validation
- Checkout with pickup or delivery
- Static QRIS and bank-transfer workflows
- Payment-proof upload and seller verification
- Order lifecycle controls
- Automatic expiration of unpaid orders
- Stock reservation and restoration
- Seller dashboard and order analytics
- Product and image management
- Configurable store profile, shipping, promo, bank, and QRIS settings
- Purchase recording with supplier and cash/bank references
- Purchase-costing allocation
- Chart of accounts and cash/bank masters
- Purchase journal
- General ledger
- Profit & loss
- Balance sheet
- Cash-flow report
- Worksheet
- Railway production preparation and health check

## Order lifecycle

~~~text
Checkout
   ↓
AWAITING_PAYMENT
   ↓
PAYMENT_REVIEW
   ↓
PAID
   ↓
PROCESSING
   ↓
READY / SHIPPED
   ↓
COMPLETED
~~~

Unpaid orders can also become `PAYMENT_REJECTED`, `CANCELLED`, or `EXPIRED` according to the supported transition rules.

At checkout, requested quantities are deducted from available product stock inside the order transaction. Eligible cancellation and expiry flows restore the reserved quantity.

## Pricing model

CemilIn supports packaged products and kilogram-based products.

The current promotion engine applies the configured tier **once to the eligible packaged-product portion of the cart**, rather than multiplying the discount by every item. KG items are kept outside that packaged-item promotion calculation.

Seed products and prices are demo/bootstrap data. Production preparation resets newly seeded stock to zero so actual stock can be entered from Seller Center.

## Accounting scope

The backend currently exposes accounting flows for:

- account master
- supplier master
- cash / bank / e-wallet master
- purchase transactions
- cash and bank transactions
- opening balances
- purchase journal
- general ledger
- profit & loss
- balance sheet
- cash flow
- worksheet

Purchase costing supports invoice and line-level discount handling before inventory cost is applied.

## Architecture

~~~mermaid
flowchart LR
    C[Customer] --> WEB[React + TypeScript]
    A[Seller / Admin] --> WEB

    WEB -->|REST / Cookies| API[Express API]

    API --> AUTH[Authentication]
    API --> CART[Cart & Pricing]
    API --> ORD[Orders & Payments]
    API --> ADM[Seller Center API]
    API --> ACC[Accounting & Purchasing]

    AUTH --> DB[(MySQL)]
    CART --> DB
    ORD --> DB
    ADM --> DB
    ACC --> DB

    API --> FILES[Product / QRIS / Payment Uploads]

    RW[Railway Service] --> API
    RW --> WEB
    RW --> DB
~~~

Production serves the Vite build and API from one Express service, keeping frontend and backend on the same public origin.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript |
| Frontend build | Vite |
| Backend | Node.js, Express |
| Database | MySQL / mysql2 |
| Authentication | JWT in HTTP-only cookie |
| Password hashing | bcrypt |
| Uploads | Multer |
| Security middleware | Helmet, CORS, express-rate-limit |
| Deployment | Railway |
| Testing | Node test runner |

## Repository structure

~~~text
Cemilin/
├── frontend/                 # React + TypeScript storefront and Seller Center
├── backend/
│   ├── src/
│   │   ├── routes/          # Public, auth, cart, orders, admin, accounting
│   │   └── services/        # Orders, accounting, purchase costing, validation
│   ├── scripts/             # Admin creation and additive DB migrations
│   └── tests/               # Backend business-logic tests
├── database/                # Base schema, seed data, additive migrations
├── scripts/                 # Local development launcher and port tests
├── railway.json             # Railway build/deploy configuration
├── PRODUCTION-RAILWAY.md    # Production deployment notes
└── README.md
~~~

## Local development

### Requirements

- Node.js 20+
- npm
- MySQL or compatible MariaDB

Install all dependencies:

~~~powershell
npm run install:all
~~~

Copy the backend environment template:

~~~powershell
copy backend\.env.example backend\.env
~~~

Configure the local database and set a random `JWT_SECRET` of at least 32 characters.

Import:

~~~text
database/001_schema.sql
database/002_seed_products.sql
~~~

Start the application:

~~~powershell
npm run dev
~~~

The local launcher automatically selects available frontend/API ports and connects the Vite proxy to the chosen API port.

## First admin

Set these only in your local/production environment:

~~~text
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
~~~

Then run:

~~~powershell
npm run admin --prefix backend
~~~

The admin password must be at least 12 characters. Remove `ADMIN_PASSWORD` from production service variables after the initial admin is created.

## Testing

Backend business logic:

~~~powershell
npm run test --prefix backend
~~~

Port-selection behavior:

~~~powershell
npm run test:ports
~~~

Current backend tests cover pricing, promo behavior, order status, account input/settings, purchase costing, cart notes/variants, username availability, and related business rules.

## Railway deployment

This repository contains `railway.json` for deployment.

Production preparation:

- creates the base schema when needed
- seeds the product catalog only for an empty catalog
- resets newly seeded production stock to zero
- applies additive migrations
- runs through the current accounting and purchase-costing migrations
- exposes `/api/health` for Railway health checks

See [PRODUCTION-RAILWAY.md](PRODUCTION-RAILWAY.md) for environment-variable and volume configuration.

## Security & repository hygiene

The repository keeps runtime secrets and customer uploads outside Git:

- `**/.env` is ignored while `.env.example` remains tracked
- `backend/uploads/` is ignored
- `frontend/dist/` is ignored
- patch backups and logs are ignored
- the checked-in JWT value is a non-production placeholder
- the server refuses to start with a missing, short, or `CHANGE_ME` JWT secret

Production credentials belong in Railway service variables, not source control.

See [SECURITY.md](SECURITY.md) for additional guidance.

## Author

**Febrian Tri Prasmanto**  
Full-Stack Programmer

- GitHub: [@Febriantrip](https://github.com/Febriantrip)
- LinkedIn: [linkedin.com/in/febriantrip](https://www.linkedin.com/in/febriantrip)

---

<p align="center">
  From snack catalog to transaction engine: storefront, operations, stock, payments, and accounting in one project.
</p>
