import { useEffect, useState } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { memberApi } from "../../lib/api";
import type { Book, Genre } from "../../lib/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Input } from "../../components/Field";
import { EmptyState } from "../../components/EmptyState";

export function CataloguePage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");

  useEffect(() => {
    memberApi.get<Genre[]>("/api/genres").then(setGenres);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (genre) params.set("genre", genre);
      memberApi.get<Book[]>(`/api/catalogue?${params.toString()}`).then(setBooks);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, genre]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Catalogue</h1>
        <p className="text-sm text-ink-muted">Browse and search the books at home.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <Input placeholder="Search by title or author…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {books && books.length === 0 && (
        <EmptyState icon={BookOpenIcon} title="No books found" description="Try a different search or genre." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books?.map((book) => (
          <Card key={book.id} className="p-5">
            <h3 className="text-base font-semibold text-plum">{book.title}</h3>
            <p className="text-sm text-ink-muted">{book.author}</p>
            {book.genres && book.genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {book.genres.map((g) => (
                  <Badge key={g} tone="neutral">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Badge tone={book.available_count > 0 ? "success" : "primary"}>
                {book.available_count > 0 ? `${book.available_count} available` : "All borrowed"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
