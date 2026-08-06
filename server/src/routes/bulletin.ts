import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireMember, requireAnyAuth, AuthedRequest } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();

router.get("/", requireAnyAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, m.name AS author_name
    FROM bulletin_posts p
    LEFT JOIN members m ON m.id = p.member_id
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  res.json(rows);
});

const createPostSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1).optional(),
  eventDate: z.string().trim().min(1).optional(),
  eventTime: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
});

router.post("/", requireMember, async (req: AuthedRequest, res) => {
  const body = createPostSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO bulletin_posts (member_id, title, body, event_date, event_time, location)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.auth!.memberId,
      body.title,
      body.body ?? null,
      body.eventDate ?? null,
      body.eventTime ?? null,
      body.location ?? null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", requireAnyAuth, async (req: AuthedRequest, res) => {
  const postRes = await pool.query("SELECT * FROM bulletin_posts WHERE id = $1", [req.params.id]);
  const post = postRes.rows[0];
  if (!post) throw new AppError(404, "Post not found");

  const isAdmin = req.auth!.role === "admin";
  const isAuthor = req.auth!.role === "member" && post.member_id === req.auth!.memberId;
  if (!isAdmin && !isAuthor) throw new AppError(403, "Not allowed to delete this post");

  await pool.query("DELETE FROM bulletin_posts WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

export default router;
