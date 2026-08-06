# Library Management System

A learning project: a small end-to-end system (React + Node/Express + Postgres) built to practice general system design. Read [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) first — it explains the data model, API, flows, and the reasoning behind each decision.

## Prerequisites

- Node.js 20+ (built and tested on Node 22)
- A Postgres database — a free [Supabase](https://supabase.com) project is the intended target, but any Postgres works for local dev

## 1. Database

1. Create a Supabase project (or use any Postgres instance).
2. Grab the connection string: **Project Settings → Database → Connection string** (use the "Transaction pooler" URI if available).

## 2. Server (`/server`)

```bash
cd server
npm install
cp .env.example .env      # then fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL
npm run hash-password -- "your-chosen-admin-password"   # paste the output into ADMIN_PASSWORD_HASH in .env
npm run migrate           # applies server/src/db/migrations/*.sql
npm run dev               # starts the API on http://localhost:4000
```

## 3. Client (`/client`)

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL should point at the server above
npm run dev                # starts the app on http://localhost:5173
```

Camera-based scanning (`getUserMedia`) requires either `localhost` or HTTPS — both are fine for local dev; keep this in mind if you ever test from a phone against a non-HTTPS LAN address.

## 4. Try the flows

1. Sign in with the admin email/password you set above.
2. **Books → Add book**: scan an ISBN barcode (or switch to manual entry) to add a title; the app mints a QR for the new copy — that QR is what circulates the book from now on.
3. **Scan**: scan that same QR. Since the copy is `available`, you'll get the lend form — pick/add a member and a duration.
4. **Scan** again on the same QR: since it's now `borrowed`, you'll get the return confirmation instead.
5. **Dashboard** shows due-soon/overdue loans; **Activity** shows the full append-only scan log.

## Deployment (Render)

- Deploy `/server` as a Render Web Service (Node). Set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `CLIENT_URL` as environment variables. Build command: `npm install && npm run build`; start command: `npm start`. Run `npm run migrate` once (e.g. via the Render shell) against the same `DATABASE_URL`.
- Deploy `/client` as a Render Static Site. Set `VITE_API_URL` to the deployed server's URL. Build command: `npm install && npm run build`; publish directory: `dist`.
- Postgres itself stays on Supabase — Render only hosts the two app services.
