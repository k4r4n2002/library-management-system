import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { requireAdmin } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      b.id, b.title, b.author, b.isbn, b.cover_url, b.created_at,
      COUNT(DISTINCT c.id)::int AS copy_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'available')::int AS available_count,
      COALESCE(array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM books b
    LEFT JOIN book_copies c ON c.book_id = b.id
    LEFT JOIN book_genres bg ON bg.book_id = b.id
    LEFT JOIN genres g ON g.id = bg.genre_id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const bookRes = await pool.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
  const book = bookRes.rows[0];
  if (!book) throw new AppError(404, "Book not found");

  const [copiesRes, genresRes] = await Promise.all([
    pool.query("SELECT * FROM book_copies WHERE book_id = $1 ORDER BY display_id", [req.params.id]),
    pool.query(
      `SELECT g.name FROM genres g JOIN book_genres bg ON bg.genre_id = g.id WHERE bg.book_id = $1 ORDER BY g.name`,
      [req.params.id]
    ),
  ]);

  res.json({ ...book, copies: copiesRes.rows, genres: genresRes.rows.map((r) => r.name) });
});

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().trim().min(1).optional(),
  coverUrl: z.string().url().optional(),
  source: z.enum(["scan", "manual"]).default("manual"),
  genres: z.array(z.string().trim().min(1)).optional(),
  shelfLocation: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

function mintQrCode() {
  return `LIBSYS:COPY:${crypto.randomUUID()}`;
}

// Upserts each genre by name and links it to the book. Genres are free-text
// on entry (like the spreadsheet's Genre1/2/3 columns) but normalized into
// a proper many-to-many underneath, so filtering/search stays clean.
async function attachGenres(client: PoolClient, bookId: string, genreNames: string[]) {
  for (const raw of genreNames) {
    const name = raw.trim();
    if (!name) continue;
    const genreRes = await client.query(
      `INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [name]
    );
    await client.query(
      `INSERT INTO book_genres (book_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [bookId, genreRes.rows[0].id]
    );
  }
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

    if (body.genres?.length) {
      await attachGenres(client, book.id, body.genres);
    }

    const qrCode = mintQrCode();
    const copyRes = await client.query(
      `INSERT INTO book_copies (book_id, qr_code, shelf_location, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [book.id, qrCode, body.shelfLocation ?? null, body.notes ?? null]
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

const addCopySchema = z.object({
  shelfLocation: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

router.post("/:id/copies", async (req, res) => {
  const body = addCopySchema.parse(req.body ?? {});
  const bookRes = await pool.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
  const book = bookRes.rows[0];
  if (!book) throw new AppError(404, "Book not found");

  const qrCode = mintQrCode();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const copyRes = await client.query(
      `INSERT INTO book_copies (book_id, qr_code, shelf_location, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [book.id, qrCode, body.shelfLocation ?? null, body.notes ?? null]
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
