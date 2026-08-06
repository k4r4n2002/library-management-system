import { Router } from "express";
import { pool } from "../db/pool";
import { requireMember } from "../middleware/requireAuth";

const router = Router();
router.use(requireMember);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const genre = (req.query.genre as string | undefined)?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(b.title ILIKE $${params.length} OR b.author ILIKE $${params.length})`);
  }
  if (genre) {
    params.push(genre);
    conditions.push(
      `EXISTS (SELECT 1 FROM book_genres bg2 JOIN genres g2 ON g2.id = bg2.genre_id WHERE bg2.book_id = b.id AND g2.name = $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `
    SELECT
      b.id, b.title, b.author, b.isbn, b.cover_url,
      COUNT(DISTINCT c.id)::int AS copy_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'available')::int AS available_count,
      COALESCE(array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM books b
    LEFT JOIN book_copies c ON c.book_id = b.id
    LEFT JOIN book_genres bg ON bg.book_id = b.id
    LEFT JOIN genres g ON g.id = bg.genre_id
    ${where}
    GROUP BY b.id
    ORDER BY b.title
    `,
    params
  );
  res.json(rows);
});

export default router;
