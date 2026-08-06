import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;

  let where = "1=1";
  if (status === "active") where = "l.returned_at IS NULL";
  else if (status === "overdue") where = "l.returned_at IS NULL AND l.due_at < now()";
  else if (status === "due_soon")
    where = "l.returned_at IS NULL AND l.due_at >= now() AND l.due_at <= now() + interval '2 days'";
  else if (status === "returned") where = "l.returned_at IS NOT NULL";

  const { rows } = await pool.query(`
    SELECT l.*, b.title, b.author, c.qr_code, m.name AS member_name, m.phone AS member_phone,
      (l.returned_at IS NULL AND l.due_at < now()) AS is_overdue
    FROM loans l
    JOIN book_copies c ON c.id = l.book_copy_id
    JOIN books b ON b.id = c.book_id
    JOIN members m ON m.id = l.member_id
    WHERE ${where}
    ORDER BY l.due_at ASC
  `);
  res.json(rows);
});

const createLoanSchema = z.object({
  copyId: z.string().uuid(),
  memberId: z.string().uuid(),
  durationDays: z.number().int().positive().max(365),
});

router.post("/", async (req, res) => {
  const body = createLoanSchema.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Row lock closes the window between "check available" and "insert loan"
    // within this transaction; the partial unique index (section 8.3) is the
    // backstop that holds even across separate transactions/connections.
    const copyRes = await client.query("SELECT * FROM book_copies WHERE id = $1 FOR UPDATE", [
      body.copyId,
    ]);
    const copy = copyRes.rows[0];
    if (!copy) throw new AppError(404, "Book copy not found");
    if (copy.status !== "available") throw new AppError(409, "This copy is not available to lend");

    const loanRes = await client.query(
      `INSERT INTO loans (book_copy_id, member_id, duration_days, due_at)
       VALUES ($1, $2, $3, now() + make_interval(days => $3))
       RETURNING *`,
      [body.copyId, body.memberId, body.durationDays]
    );
    const loan = loanRes.rows[0];

    await client.query(`UPDATE book_copies SET status = 'borrowed' WHERE id = $1`, [body.copyId]);
    await client.query(
      `INSERT INTO scan_logs (event_type, scanned_code, book_copy_id, loan_id) VALUES ('lend', $1, $2, $3)`,
      [copy.qr_code, copy.id, loan.id]
    );

    await client.query("COMMIT");
    res.status(201).json(loan);
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err?.code === "23505") {
      throw new AppError(409, "This copy already has an active loan (race condition caught by the DB)");
    }
    throw err;
  } finally {
    client.release();
  }
});

router.post("/:id/return", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Conditioning the UPDATE on returned_at IS NULL makes this itself
    // atomic: a second concurrent return attempt affects zero rows.
    const loanRes = await client.query(
      `UPDATE loans SET returned_at = now() WHERE id = $1 AND returned_at IS NULL RETURNING *`,
      [req.params.id]
    );
    const loan = loanRes.rows[0];
    if (!loan) throw new AppError(409, "Loan not found or already returned");

    const copyRes = await client.query(
      `UPDATE book_copies SET status = 'available' WHERE id = $1 RETURNING *`,
      [loan.book_copy_id]
    );
    const copy = copyRes.rows[0];

    await client.query(
      `INSERT INTO scan_logs (event_type, scanned_code, book_copy_id, loan_id) VALUES ('return', $1, $2, $3)`,
      [copy.qr_code, copy.id, loan.id]
    );

    await client.query("COMMIT");
    res.json(loan);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
