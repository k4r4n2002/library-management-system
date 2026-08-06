import { useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { QrScanner } from "../../components/QrScanner";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { MemberPicker } from "../../components/MemberPicker";
import { CopyStatusBadge } from "../../components/Badge";
import { adminApi as api, ApiError } from "../../lib/api";
import type { Member, ResolveResult, Loan } from "../../lib/types";

type ViewState =
  | { kind: "scanning" }
  | { kind: "resolving" }
  | { kind: "lend"; result: ResolveResult }
  | { kind: "return"; result: ResolveResult }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const DURATIONS = [7, 14, 21, 30];

export function ScanPage() {
  const [view, setView] = useState<ViewState>({ kind: "scanning" });

  async function handleScan(code: string) {
    setView({ kind: "resolving" });
    try {
      const result = await api.get<ResolveResult>(`/api/scan/resolve?code=${encodeURIComponent(code)}`);
      setView(result.copy.status === "available" ? { kind: "lend", result } : { kind: "return", result });
    } catch (err) {
      setView({ kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  function reset() {
    setView({ kind: "scanning" });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl">Scan</h1>
        <p className="text-sm text-ink-muted">
          Scan a copy's QR to lend it out — scan the same QR again later to check it back in.
        </p>
      </div>

      <Card className="p-6">
        {view.kind === "scanning" && <QrScanner active onScan={handleScan} />}
        {view.kind === "resolving" && <p className="text-center text-sm text-ink-muted">Looking that up…</p>}
        {view.kind === "lend" && <LendPanel result={view.result} onDone={setView} onCancel={reset} />}
        {view.kind === "return" && <ReturnPanel result={view.result} onDone={setView} onCancel={reset} />}
        {view.kind === "error" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <ExclamationCircleIcon className="h-10 w-10 text-danger" />
            <p className="text-sm font-medium text-danger">{view.message}</p>
            <Button onClick={reset}>Scan again</Button>
          </div>
        )}
        {view.kind === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircleIcon className="h-10 w-10 text-success" />
            <p className="text-sm font-medium text-ink">{view.message}</p>
            <Button onClick={reset}>
              <QrCodeIcon className="h-4 w-4" /> Scan next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function LendPanel({
  result,
  onDone,
  onCancel,
}: {
  result: ResolveResult;
  onDone: (v: ViewState) => void;
  onCancel: () => void;
}) {
  const [member, setMember] = useState<Member | null>(null);
  const [duration, setDuration] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmLend() {
    if (!member) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post<Loan>("/api/loans", {
        copyId: result.copy.id,
        memberId: member.id,
        durationDays: duration,
      });
      onDone({ kind: "success", message: `"${result.book.title}" is now on loan to ${member.name}.` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the loan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <BookHeader result={result} />
      {!member ? (
        <MemberPicker onSelect={setMember} />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{member.name}</p>
              <p className="text-xs text-ink-muted">{member.phone ?? "No phone on file"}</p>
            </div>
            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-primary"
              onClick={() => setMember(null)}
            >
              Change
            </button>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Loan duration</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium ${
                    duration === d
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border-soft text-ink-muted"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={confirmLend} disabled={submitting} className="flex-1">
              {submitting ? "Lending…" : "Confirm lend"}
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReturnPanel({
  result,
  onDone,
  onCancel,
}: {
  result: ResolveResult;
  onDone: (v: ViewState) => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loan = result.activeLoan;

  async function confirmReturn() {
    if (!loan) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/loans/${loan.id}/return`);
      onDone({ kind: "success", message: `"${result.book.title}" checked back in.` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't process the return");
    } finally {
      setSubmitting(false);
    }
  }

  const isOverdue = loan ? new Date(loan.due_at).getTime() < Date.now() : false;

  return (
    <div className="space-y-4">
      <BookHeader result={result} />
      {loan && (
        <div className="rounded-xl border border-border-soft p-4">
          <p className="text-sm font-semibold text-ink">Borrowed by {loan.member_name}</p>
          <p className="text-xs text-ink-muted">{loan.member_phone ?? "No phone on file"}</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-muted">Due {new Date(loan.due_at).toLocaleDateString()}</span>
            {isOverdue && <span className="font-semibold text-danger">Overdue</span>}
          </div>
        </div>
      )}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={confirmReturn} disabled={submitting} className="flex-1">
          {submitting ? "Processing…" : "Mark returned"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function BookHeader({ result }: { result: ResolveResult }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-primary-soft/50 p-3">
      {result.book.coverUrl ? (
        <img src={result.book.coverUrl} alt="" className="h-14 w-10 rounded object-cover" />
      ) : (
        <div className="h-14 w-10 rounded bg-primary-soft" />
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold text-plum">{result.book.title}</p>
        <p className="text-xs text-ink-muted">{result.book.author}</p>
      </div>
      <CopyStatusBadge status={result.copy.status} />
    </div>
  );
}
