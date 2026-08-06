import { Router } from "express";
import { pool } from "../db/pool";
import { requireAdmin } from "../middleware/requireAuth";

const router = Router();
router.use(requireAdmin);

router.get("/summary", async (req, res) => {
  const [books, copies, active, dueSoon, overdue] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM books"),
    pool.query("SELECT COUNT(*)::int AS count FROM book_copies"),
    pool.query("SELECT COUNT(*)::int AS count FROM loans WHERE returned_at IS NULL"),
    pool.query(
      "SELECT COUNT(*)::int AS count FROM loans WHERE returned_at IS NULL AND due_at >= now() AND due_at <= now() + interval '2 days'"
    ),
    pool.query("SELECT COUNT(*)::int AS count FROM loans WHERE returned_at IS NULL AND due_at < now()"),
  ]);

  res.json({
    totalBooks: books.rows[0].count,
    totalCopies: copies.rows[0].count,
    activeLoans: active.rows[0].count,
    dueSoon: dueSoon.rows[0].count,
    overdue: overdue.rows[0].count,
  });
});

router.get("/scan-logs", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT sl.*, b.title, c.qr_code
    FROM scan_logs sl
    LEFT JOIN book_copies c ON c.id = sl.book_copy_id
    LEFT JOIN books b ON b.id = c.book_id
    ORDER BY sl.scanned_at DESC
    LIMIT 100
  `);
  res.json(rows);
});

export default router;
