import { Router } from "express";
import { pool } from "../db/pool";
import { requireMember, AuthedRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireMember);

router.get("/", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `
    SELECT l.*, b.title, b.author, c.qr_code,
      (l.returned_at IS NULL AND l.due_at < now()) AS is_overdue
    FROM loans l
    JOIN book_copies c ON c.id = l.book_copy_id
    JOIN books b ON b.id = c.book_id
    WHERE l.member_id = $1
    ORDER BY l.borrowed_at DESC
    `,
    [req.auth!.memberId]
  );
  res.json(rows);
});

export default router;
