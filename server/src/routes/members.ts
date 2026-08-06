import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAdmin } from "../middleware/requireAuth";

const router = Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    const { rows } = await pool.query(
      "SELECT id, name, phone, email, created_at FROM members ORDER BY created_at DESC LIMIT 50"
    );
    return res.json(rows);
  }
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, created_at FROM members
     WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 20`,
    [`%${q}%`]
  );
  res.json(rows);
});

const createMemberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
});

function generatePasscode() {
  return String(crypto.randomInt(1000, 10000)); // 4 digits, 1000-9999
}

// Every new member gets a passcode — cheap to generate, and it means there's
// only one "add member" flow rather than a separate one for portal access.
// Admin decides whether/when to actually relay it.
router.post("/", async (req, res) => {
  const body = createMemberSchema.parse(req.body);
  const passcode = generatePasscode();
  const passcodeHash = await bcrypt.hash(passcode, 10);

  const { rows } = await pool.query(
    `INSERT INTO members (name, phone, email, passcode_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, phone, email, created_at`,
    [body.name, body.phone ?? null, body.email ?? null, passcodeHash]
  );

  res.status(201).json({ ...rows[0], passcode });
});

export default router;
