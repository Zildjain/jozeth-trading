# JOZETH TRADING — Full-Stack Starter

A React/Vite frontend connected to an Express API and MongoDB. This project is designed for the Business Operations and Records Management System handoff: products, customers, suppliers, sales, inventory, procurement, business records, reports, settings, users, and role permissions.

**This is a full-stack project starter, not a security-certified production deployment.** It includes the core API and workflow protections described below, but you still need to run the setup and test it on your computer before using real business data.

## Requirements

- Node.js **20.19+ or 22.12+** and npm (Vite 7 requirement).
- For local MongoDB, Docker Desktop with Docker Compose.
- A terminal. Git Bash commands are shown below; PowerShell alternatives are included where they differ.

## Quick start — local MongoDB with Docker

Open VS Code to the folder that contains this `README.md` and `package.json`. Do not run npm from a parent Downloads folder.

### 1. Create your environment file

Git Bash:

```bash
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

PowerShell:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Open `.env`, replace `JWT_SECRET` with the long random value printed by Node, and save. Keep `.env` private; it is excluded from Git. Do not paste database credentials or the JWT secret into React code.

### 2. Start MongoDB

Start Docker Desktop, then run:

```bash
docker compose up -d mongo
```

Initialize the one-node local replica set required for atomic multi-document transactions:

```bash
docker compose exec mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

Check the status:

```bash
docker compose exec mongo mongosh --quiet --eval "rs.status().ok"
```

A result of `1` means the replica set is healthy. On later starts, `rs.initiate` may say the replica set is already initialized; that is expected. If MongoDB is still starting, wait a few seconds and repeat the status check.

The Docker Compose file binds the MongoDB port to `127.0.0.1` on your own computer, not all network interfaces. This is intended for local development, not for deploying the database as a public service.

### 3. Install the project packages

```bash
npm install
```

If PowerShell blocks the npm script, use `npm.cmd install` and `npm.cmd run dev`. Git Bash normally uses `npm install` and `npm run dev`.

### 4. Create the initial demo data

```bash
npm run db:seed
```

The seed script inserts sample products, customers, suppliers, demo transactions, movements, procurement requests, records, default permissions, user settings, and hashed-password demo accounts. It only seeds each collection if that collection is empty; it does not wipe or overwrite existing data.

Default accounts for a **new demo database only**:

| Role | Username | Demo password |
|---|---|---|
| Administrator | `admin` | `AdminDemo!2026` |
| Manager / Owner | `manager` | `ManagerDemo!2026` |
| Staff | `staff` | `StaffDemo!2026` |

Before the first seed, you may set `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`, and `SEED_STAFF_PASSWORD` in `.env` to your own strong passwords. They must each be at least 12 characters and include upper/lowercase letters, a number, and a symbol. After logging in, change the demo password in **Settings → Security**. The defaults are for a local class/demo setup only.

### 5. Start the frontend and API

```bash
npm run dev
```

This starts both services in one terminal:

- React/Vite: `http://localhost:5173`
- Express API: `http://127.0.0.1:4000`
- Health check: `http://127.0.0.1:4000/api/health` (or via the Vite proxy: `http://localhost:5173/api/health`)

Open `http://localhost:5173`. The UI sends requests through `/api`; it never connects directly to MongoDB.

## Alternative: MongoDB Atlas

If you do not want Docker/local MongoDB, create an Atlas project and cluster, then:

1. Create a **database user** that has only the `readWrite` role on the `jozeth_trading` database. Do not use your Atlas account-owner credential as the application database user.
2. Add only your current development IP to the Atlas Network Access list while developing. Avoid `0.0.0.0/0` unless you explicitly understand the exposure risk.
3. Copy the Atlas driver connection string. Put it in `.env` as `MONGODB_URI`, replace the username/password placeholders, URL-encode special characters in the password, and ensure the database path is `jozeth_trading`.
4. Do **not** add the local `replicaSet=rs0&directConnection=true` parameters to the Atlas-provided `mongodb+srv://` URI. Atlas clusters support transactions.
5. Seed and launch as above.

Never put a MongoDB URI in `src/`, `VITE_*` variables, a public repository, or browser storage. The database URI belongs only in the server-side `.env`.

## Production build/run (after local testing)

```bash
npm run build
```

Set appropriate production variables on the server (not in the client bundle):

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
CLIENT_ORIGIN=https://your-real-domain.example
COOKIE_SECURE=true
MONGODB_URI=your-private-production-mongodb-uri
JWT_SECRET=your-new-long-random-secret
```

Use HTTPS with a correctly configured reverse proxy or hosting platform. Keep MongoDB private and require database authentication; use a least-privilege database user; restrict network access; configure `TRUST_PROXY=true` only if the deployment is behind exactly one trusted proxy; configure backups and monitoring; and rotate secrets if they are ever exposed. The Express server serves `dist/` in production mode so the UI and `/api` can share one origin.

Do not use this local Docker Compose database as a public production database: it is configured for local development and does not enable MongoDB database authentication. For production, use Atlas or a properly secured managed/self-hosted deployment.

## What is implemented

### Backend and database

- Express API and MongoDB/Mongoose models for users, products, customers, suppliers, sales/transactions, inventory movement history, procurement, business records, role permissions, user settings, and activity log.
- MongoDB unique indexes for business IDs, usernames, emails and one settings record per user.
- Mongoose strict schemas and query strictness; server-side Zod validation rejects unknown body fields, object-valued scalar inputs and common `$`-operator injection attempts.
- No endpoint accepts or executes a client-supplied Mongo query, update document, collection name, JavaScript expression, or full client state snapshot.
- Password hashing with bcrypt; passwords and hashes are not returned to the UI.
- JWT sessions in HTTP-only, `SameSite=Strict` cookies; HTTPS-only Secure cookies in production; role and module access checks on server routes.
- Login/API rate limits, strict CORS allowlist, origin/fetch metadata checks, custom mutation request header, Helmet security headers/CSP, bounded JSON body size, safe error responses, and activity/audit entries.
- API-only database access. MongoDB does not listen on the public network in the local Compose setup.

### Corrected operations

- **Sales & Transactions:** server determines unit prices from stored products; rejects missing/inactive customers/products and bad quantities; totals are not trusted from the browser; completed sales deduct stock in a transaction; pending sales have no stock impact; completing a pending sale deducts once; cancelled/completed transactions cannot be improperly reprocessed.
- **Inventory:** stock-in/out uses server-calculated current quantity; stock-out cannot make stock negative; product quantity can only be changed through movement/sale/receiving workflows; every movement records previous/current quantity, actor, reference and movement source.
- **Procurement:** validates supplier and product; enforces allowed status transitions; receiving adds the requested quantity and creates a stock ledger entry in the same database transaction; `stockApplied` and a unique movement index help prevent a duplicated receipt.
- MongoDB transaction support is checked at API startup. This is required because the stock, transaction/procurement record, movement ledger and activity log may need to commit together. MongoDB standalone deployments do not support multi-document transactions; configure a replica set or use Atlas. See [MongoDB transaction documentation](https://www.mongodb.com/docs/manual/core/transactions/) and [production considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

### Validation and other modules

- Server input schemas for login, password change, profile, products, customers, suppliers, transactions, stock movements, procurement, business records/attachments, users, settings, and role permissions.
- Password policy: at least 12 characters, uppercase, lowercase, a number, and a symbol.
- Product quantity is not editable on a product form; create products at zero stock and use Inventory → Stock In or receive a procurement request.
- Records allow limited file types (PDF, PNG, JPEG, TXT, CSV) with a 1 MB file limit. Files are stored as small base64 payloads in MongoDB for demo use; use dedicated object storage for large files in production.
- Reports are generated from the database-backed records loaded by the app and can be exported/printed from the UI.
- The original burgundy sidebar, blush top bar, muted page background, white panels, orange action buttons, and account/logout-at-bottom layout are retained.

## Validation checks

After installing dependencies, run:

```bash
npm run check
npm run build
```

`npm run check` tests that common injection-shaped inputs, unknown update keys, invalid stock quantities, and attempts to change stock via product editing are rejected by validation. These checks are not a replacement for a full security review, integration tests, backups, or authorization tests before a real deployment.

## Data reset (destructive)

**This permanently deletes the selected app database. Back up anything you need first.** To reset local demo data intentionally:

```bash
CONFIRM_DATABASE_RESET=true npm run db:reset
npm run db:seed
```

PowerShell:

```powershell
$env:CONFIRM_DATABASE_RESET="true"
npm run db:reset
Remove-Item Env:CONFIRM_DATABASE_RESET
npm run db:seed
```

## Scope boundaries and security note

The app does not implement VAT/tax computation, accounting, payroll, external government integrations, online payments, advanced AI, or predictive analytics, in line with the project scope. It uses demo records and is not yet reviewed for regulatory or production use.

No application can honestly guarantee that it is impossible to exploit. This project reduces common injection risk by accepting only validated fields and scalar values, using server-authored query filters, applying strict database schemas, keeping credentials and the DB private, and enforcing server-side authorization. Before using real company data, have a developer test the system, set up backups, use HTTPS and managed secrets, review dependencies with `npm audit`, configure least-privilege DB credentials, and test recovery from failed/duplicate operations.
