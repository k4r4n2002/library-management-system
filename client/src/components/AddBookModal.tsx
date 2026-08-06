import { useState } from "react";
import { CameraIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field, Input } from "./Field";
import { QrScanner } from "./QrScanner";
import { QrImage } from "./QrImage";
import { api, ApiError } from "../lib/api";
import type { Book, BookCopy } from "../lib/types";

type Mode = "scan" | "manual";
type Step = "capture" | "confirm" | "done";

export function AddBookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<Mode>("scan");
  const [step, setStep] = useState<Step>("capture");
  const [scanning, setScanning] = useState(true);
  const [lookupNotice, setLookupNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", author: "", isbn: "", coverUrl: "" });
  const [source, setSource] = useState<"scan" | "manual">("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCopy, setNewCopy] = useState<BookCopy | null>(null);

  async function handleIsbnScanned(code: string) {
    const isbn = code.replace(/[^0-9Xx]/g, "");
    // A real ISBN is always 10 or 13 digits. Anything else is almost
    // certainly a misread of a different barcode nearby — ignore it and
    // keep the camera running rather than surfacing a confusing error.
    if (isbn.length !== 10 && isbn.length !== 13) return;

    setScanning(false);
    setLookupNotice(null);
    try {
      const meta = await api.get<{ title?: string; author?: string; coverUrl?: string; isbn: string }>(
        `/api/lookup/isbn/${isbn}`
      );
      setForm({
        title: meta.title ?? "",
        author: meta.author ?? "",
        isbn: meta.isbn,
        coverUrl: meta.coverUrl ?? "",
      });
      setSource("scan");
    } catch (err) {
      setForm((f) => ({ ...f, isbn }));
      setSource("scan");
      setLookupNotice(
        err instanceof ApiError && err.status === 404
          ? "No metadata found for that ISBN — fill in the details below."
          : "Couldn't reach the ISBN lookup service — fill in the details below."
      );
    }
    setStep("confirm");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<Book & { copy: BookCopy }>("/api/books", {
        title: form.title,
        author: form.author,
        isbn: form.isbn || undefined,
        coverUrl: form.coverUrl || undefined,
        source,
      });
      setNewCopy(result.copy);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this book");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && newCopy) {
    return (
      <Modal title="Book added" onClose={onCreated}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-ink-muted">
            Print this QR and stick it on the copy — it's what you'll scan to lend and return it.
          </p>
          <QrImage copyId={newCopy.id} size={200} />
          <Button onClick={onCreated} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add a book" onClose={onClose}>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("scan");
            setStep("capture");
            setScanning(true);
          }}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${
            mode === "scan" ? "border-primary bg-primary-soft text-primary" : "border-border-soft text-ink-muted"
          }`}
        >
          <CameraIcon className="h-4 w-4" /> Scan ISBN
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setStep("confirm");
            setSource("manual");
          }}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${
            mode === "manual" ? "border-primary bg-primary-soft text-primary" : "border-border-soft text-ink-muted"
          }`}
        >
          <PencilSquareIcon className="h-4 w-4" /> Manual entry
        </button>
      </div>

      {mode === "scan" && step === "capture" && (
        <div className="space-y-3">
          <p className="text-center text-sm text-ink-muted">
            Point the camera at the book's ISBN barcode.
          </p>
          <QrScanner active={scanning} onScan={handleIsbnScanned} boxAspect="wide" />
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          {lookupNotice && (
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
              {lookupNotice}
            </p>
          )}
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Author">
            <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
          </Field>
          <Field label="ISBN" hint="Optional, but lets a second copy join the same title.">
            <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
          </Field>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim() || !form.author.trim()}
              className="flex-1"
            >
              {submitting ? "Saving…" : "Save book"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
