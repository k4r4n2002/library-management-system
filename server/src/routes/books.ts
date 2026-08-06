import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      b.id, b.title, b.author, b.isbn, b.cover_url, b.created_at,
      COUNT(c.id)::int AS copy_count,
      COUNT(c.id) FILTER (WHERE c.status = 'available')::int AS available_count
    FROM books b
    LEFT JOIN book_copies c ON c.book_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const bookRes = await pool.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
  const book = bookRes.rows[0];
  if (!book) throw new AppError(404, "Book not found");

  const copiesRes = await pool.query(
    "SELECT * FROM book_copies WHERE book_id = $1 ORDER BY added_at",
    [req.params.id]
  );
  res.json({ ...book, copies: copiesRes.rows });
});

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().trim().min(1).optional(),
  coverUrl: z.string().url().optional(),
  source: z.enum(["scan", "manual"]).default("manual"),
});

function mintQrCode() {
  return `LIBSYS:COPY:${crypto.randomUUID()}`;
}

router.post("/", async (req, res) => {
  const body = createBookSchema.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // A second copy of a title already in the catalog (matched by ISBN)
    // becomes a new book_copies row, not a duplicate books row.
    let book;
    if (body.isbn) {
      const existing = await client.query("SELECT * FROM books WHERE isbn = $1", [body.isbn]);
      book = existing.rows[0];
    }
    if (!book) {
      const inserted = await client.query(
        `INSERT INTO books (title, author, isbn, cover_url) VALUES ($1, $2, $3, $4) RETURNING *`,
        [body.title, body.author, body.isbn ?? null, body.coverUrl ?? null]
      );
      book = inserted.rows[0];
    }

    const qrCode = mintQrCode();
    const copyRes = await client.query(
      `INSERT INTO book_copies (book_id, qr_code) VALUES ($1, $2) RETURNING *`,
      [book.id, qrCode]
    );
    const copy = copyRes.rows[0];

    await client.query(
      `INSERT INTO scan_logs (event_type, scanned_code, book_copy_id, raw_payload)
       VALUES ('book_ingest', $1, $2, $3)`,
      [body.isbn ?? qrCode, copy.id, JSON.stringify({ source: body.source, title: body.title })]
    );

    await client.query("COMMIT");
    res.status(201).json({ ...book, copy });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/:id/copies", async (req, res) => {
  const bookRes = await pool.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
  const book = bookRes.rows[0];
  if (!book) throw new AppError(404, "Book not found");

  const qrCode = mintQrCode();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const copyRes = await client.query(
      `INSERT INTO book_copies (book_id, qr_code) VALUES ($1, $2) RETURNING *`,
      [book.id, qrCode]
    );
    const copy = copyRes.rows[0];
    await client.query(
      `INSERT INTO scan_logs (event_type, scanned_code, book_copy_id, raw_payload)
       VALUES ('book_ingest', $1, $2, $3)`,
      [qrCode, copy.id, JSON.stringify({ source: "manual", additionalCopy: true })]
    );
    await client.query("COMMIT");
    res.status(201).json(copy);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
