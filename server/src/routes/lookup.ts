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

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`[isbn-lookup] network error reaching Open Library for ISBN ${isbn}:`, err);
    throw new AppError(502, "Couldn't reach the ISBN lookup service — enter details manually");
  }

  if (!response.ok) {
    console.error(`[isbn-lookup] Open Library returned HTTP ${response.status} for ISBN ${isbn}`);
    throw new AppError(502, "ISBN lookup service returned an error — enter details manually");
  }

  const data = (await response.json()) as Record<string, OpenLibraryEntry>;
  const entry = data[`ISBN:${isbn}`];

  if (!entry) {
    console.log(`[isbn-lookup] MISS for ISBN ${isbn} — Open Library has no record of it`);
    throw new AppError(404, "No metadata found for this ISBN — enter it manually");
  }

  console.log(`[isbn-lookup] HIT for ISBN ${isbn}: "${entry.title}" by ${entry.authors?.[0]?.name ?? "unknown"}`);
  res.json({
    isbn,
    title: entry.title,
    author: entry.authors?.[0]?.name,
    coverUrl: entry.cover?.medium ?? entry.cover?.large ?? entry.cover?.small,
  });
});

export default router;
