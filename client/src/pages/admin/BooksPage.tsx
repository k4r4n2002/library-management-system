import { useEffect, useState } from "react";
import { PlusIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { adminApi as api } from "../../lib/api";
import type { Book } from "../../lib/types";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { AddBookModal } from "../../components/AddBookModal";
import { CopiesModal } from "../../components/CopiesModal";

export function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  function refresh() {
    api.get<Book[]>("/api/books").then(setBooks);
  }

  useEffect(refresh, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Books</h1>
          <p className="text-sm text-ink-muted">Your catalog, title by title.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <PlusIcon className="h-4 w-4" /> Add book
        </Button>
      </div>

      {books && books.length === 0 && (
        <EmptyState
          icon={BookOpenIcon}
          title="No books yet"
          description="Add your first book by scanning its ISBN barcode or entering the details manually."
          action={<Button onClick={() => setShowAdd(true)}>Add a book</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books?.map((book) => (
          <Card
            key={book.id}
            className="cursor-pointer p-5 hover:border-primary"
            onClick={() => setOpenBookId(book.id)}
          >
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
            <div className="mt-3 flex items-center gap-2">
              <Badge tone={book.available_count > 0 ? "success" : "primary"}>
                {book.available_count} of {book.copy_count} available
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <AddBookModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}

      {openBookId && (
        <CopiesModal
          bookId={openBookId}
          onClose={() => {
            setOpenBookId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
