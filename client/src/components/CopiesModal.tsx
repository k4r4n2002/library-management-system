import { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { QrImage } from "./QrImage";
import { CopyStatusBadge } from "./Badge";
import { api } from "../lib/api";
import type { BookDetail, BookCopy } from "../lib/types";

export function CopiesModal({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [adding, setAdding] = useState(false);

  function refresh() {
    api.get<BookDetail>(`/api/books/${bookId}`).then(setBook);
  }

  useEffect(refresh, [bookId]);

  async function handleAddCopy() {
    setAdding(true);
    try {
      const copy = await api.post<BookCopy>(`/api/books/${bookId}/copies`);
      setBook((b) => (b ? { ...b, copies: [...b.copies, copy] } : b));
    } finally {
      setAdding(false);
    }
  }

  if (!book) return null;

  return (
    <Modal title={book.title} onClose={onClose}>
      <p className="mb-4 text-sm text-ink-muted">by {book.author}</p>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {book.copies.map((copy) => (
          <div key={copy.id} className="flex items-center gap-4 rounded-xl border border-border-soft p-3">
            <QrImage copyId={copy.id} size={64} />
            <div className="flex-1">
              <p className="text-xs text-ink-muted">Added {new Date(copy.added_at).toLocaleDateString()}</p>
              <div className="mt-1">
                <CopyStatusBadge status={copy.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={handleAddCopy} disabled={adding} className="mt-4">
        <PlusIcon className="h-4 w-4" /> {adding ? "Adding…" : "Add another copy"}
      </Button>
    </Modal>
  );
}
