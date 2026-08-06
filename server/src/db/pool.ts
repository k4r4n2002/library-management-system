import { Pool, types } from "pg";

// node-postgres otherwise parses DATE columns into JS Date objects at
// local midnight, which then serialize to a different UTC calendar date for
// any positive UTC offset (e.g. IST) — a real "event shows up a day early"
// bug. Keep DATE columns as plain "YYYY-MM-DD" strings instead.
types.setTypeParser(types.builtins.DATE, (value) => value);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase's pooled/direct endpoints require SSL; a local Postgres typically doesn't.
const needsSsl = /supabase\.(co|com)|sslmode=require/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
