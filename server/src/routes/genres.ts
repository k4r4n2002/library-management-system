import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAnyAuth, requireAdmin } from "../middleware/requireAuth";

const router = Router();

// Both the admin's genre picker and the member catalogue filter need this list.
router.get("/", requireAnyAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM genres ORDER BY name");
  res.json(rows);
});

const createGenreSchema = z.object({ name: z.string().trim().min(1) });

router.post("/", requireAdmin, async (req, res) => {
  const { name } = createGenreSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
    [name]
  );
  res.status(201).json(rows[0]);
});

export default router;
