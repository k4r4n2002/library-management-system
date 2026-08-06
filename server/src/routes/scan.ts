import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAuth);

// The single "one QR, two meanings" endpoint (SYSTEM_DESIGN.md section 8.2):
// the caller doesn't say whether it's lending or returning — the copy's
// current status decides which form the UI should render next.
router.get("/resolve", async (req, res) => {
  const code = (req.query.code as string | undefined)?.trim();
  if (!code) throw new AppError(400, "Missing code");

  const copyRes = await pool.query(
    `SELECT c.*, b.title, b.author, b.cover_url
     FROM book_copies c JOIN books b ON b.id = c.book_id
     WHERE c.qr_code = $1`,
    [code]
  );
  const copy = copyRes.rows[0];

  if (!copy) {
    await pool.query(`INSERT INTO scan_logs (event_type, scanned_code) VALUES ('unresolved', $1)`, [
      code,
    ]);
    throw new AppError(404, "Unrecognized code — this isn't a known book copy QR");
  }

  let activeLoan = null;
  if (copy.status === "borrowed") {
    const loanRes = await pool.query(
      `SELECT l.*, m.name AS member_name, m.phone AS member_phone
       FROM loans l JOIN members m ON m.id = l.member_id
       WHERE l.book_copy_id = $1 AND l.returned_at IS NULL`,
      [copy.id]
    );
    activeLoan = loanRes.rows[0] ?? null;
  }

  res.json({
    copy: { id: copy.id, qrCode: copy.qr_code, status: copy.status },
    book: { id: copy.book_id, title: copy.title, author: copy.author, coverUrl: copy.cover_url },
    activeLoan,
  });
});

export default router;
