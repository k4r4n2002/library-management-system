import { Router } from "express";
import { requireAdmin } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
router.use(requireAdmin);

interface BookMeta {
  title?: string;
  author?: string;
  coverUrl?: string;
}

interface OpenLibraryEntry {
  title?: string;
  authors?: { name: string }[];
  cover?: { small?: string; medium?: string; large?: string };
}

// Free, no API key, decent coverage for mainstream books — checked first.
async function lookupOpenLibrary(isbn: string): Promise<BookMeta | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`[isbn-lookup] Open Library network error for ISBN ${isbn}:`, err);
    return null;
  }
  if (!response.ok) {
    console.error(`[isbn-lookup] Open Library returned HTTP ${response.status} for ISBN ${isbn}`);
    return null;
  }

  const data = (await response.json()) as Record<string, OpenLibraryEntry>;
  const entry = data[`ISBN:${isbn}`];
  if (!entry) {
    console.log(`[isbn-lookup] Open Library MISS for ISBN ${isbn}`);
    return null;
  }

  console.log(`[isbn-lookup] Open Library HIT for ISBN ${isbn}: "${entry.title}"`);
  return {
    title: entry.title,
    author: entry.authors?.[0]?.name,
    coverUrl: entry.cover?.medium ?? entry.cover?.large ?? entry.cover?.small,
  };
}

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

// Bigger catalog, including regional/local-market editions Open Library
// tends to miss — but requires a free Google Cloud API key (no billing
// needed, generous free daily quota). Skipped entirely if unconfigured.
async function lookupGoogleBooks(isbn: string): Promise<BookMeta | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`[isbn-lookup] Google Books network error for ISBN ${isbn}:`, err);
    return null;
  }
  if (!response.ok) {
    console.error(`[isbn-lookup] Google Books returned HTTP ${response.status} for ISBN ${isbn}`);
    return null;
  }

  const data = (await response.json()) as { items?: { volumeInfo: GoogleVolumeInfo }[] };
  const info = data.items?.[0]?.volumeInfo;
  if (!info) {
    console.log(`[isbn-lookup] Google Books MISS for ISBN ${isbn}`);
    return null;
  }

  console.log(`[isbn-lookup] Google Books HIT for ISBN ${isbn}: "${info.title}"`);
  return {
    title: info.title,
    author: info.authors?.[0],
    coverUrl: info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
  };
}

router.get("/isbn/:isbn", async (req, res) => {
  const isbn = req.params.isbn.replace(/[^0-9Xx]/g, "");
  if (!isbn) throw new AppError(400, "Invalid ISBN");

  const meta = (await lookupOpenLibrary(isbn)) ?? (await lookupGoogleBooks(isbn));

  if (!meta) {
    throw new AppError(404, "No metadata found for this ISBN — enter it manually");
  }

  res.json({ isbn, ...meta });
});

export default router;
