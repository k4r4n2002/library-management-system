import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    const { rows } = await pool.query("SELECT * FROM members ORDER BY created_at DESC LIMIT 50");
    return res.json(rows);
  }
  const { rows } = await pool.query(
    `SELECT * FROM members WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 20`,
    [`%${q}%`]
  );
  res.json(rows);
});

const createMemberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
});

router.post("/", async (req, res) => {
  const body = createMemberSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO members (name, phone, email) VALUES ($1, $2, $3) RETURNING *`,
    [body.name, body.phone ?? null, body.email ?? null]
  );
  res.status(201).json(rows[0]);
});

export default router;
