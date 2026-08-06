import { Router } from "express";
import QRCode from "qrcode";
import { pool } from "../db/pool";
import { requireAdmin } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAdmin);

// Rendered on demand from the short text code — never stored as a file.
// See SYSTEM_DESIGN.md section 8.4.
router.get("/:copyId/qr.png", async (req, res) => {
  const { rows } = await pool.query("SELECT qr_code FROM book_copies WHERE id = $1", [
    req.params.copyId,
  ]);
  const copy = rows[0];
  if (!copy) throw new AppError(404, "Copy not found");

  const buffer = await QRCode.toBuffer(copy.qr_code, { type: "png", margin: 1, width: 300 });
  res.setHeader("Content-Type", "image/png");
  res.send(buffer);
});

export default router;
