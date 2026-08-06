import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAuth);

interface OpenLibraryEntry {
  title?: string;
  authors?: { name: string }[];
  cover?: { small?: string; medium?: string; large?: string };
}

// Open Library: free, no API key. This is the only external call in the app,
// used purely to save typing when ingesting a book — never required.
router.get("/isbn/:isbn", async (req, res) => {
  const isbn = req.params.isbn.replace(/[^0-9Xx]/g, "");
  if (!isbn) throw new AppError(400, "Invalid ISBN");

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const response = await fetch(url);
  if (!response.ok) throw new AppError(502, "Open Library lookup failed");

  const data = (await response.json()) as Record<string, OpenLibraryEntry>;
  const entry = data[`ISBN:${isbn}`];
  if (!entry) throw new AppError(404, "No metadata found for this ISBN — enter it manually");

  res.json({
    isbn,
    title: entry.title,
    author: entry.authors?.[0]?.name,
    coverUrl: entry.cover?.medium ?? entry.cover?.large ?? entry.cover?.small,
  });
});

export default router;
