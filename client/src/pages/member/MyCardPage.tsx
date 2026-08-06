import { useEffect, useState } from "react";
import { IdentificationIcon } from "@heroicons/react/24/outline";
import { memberApi } from "../../lib/api";
import type { Loan } from "../../lib/types";
import { Card } from "../../components/Card";
import { LoanStatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";

export function MyCardPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);

  useEffect(() => {
    memberApi.get<Loan[]>("/api/my-loans").then(setLoans);
  }, []);

  const current = loans?.filter((l) => !l.returned_at) ?? [];
  const past = loans?.filter((l) => l.returned_at) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">My Card</h1>
        <p className="text-sm text-ink-muted">
          Everything you currently have, and everything you've borrowed before.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-base">Currently borrowed</h2>
        {loans && current.length === 0 && (
          <EmptyState
            icon={IdentificationIcon}
            title="Nothing borrowed right now"
            description="Ask the librarian to scan a book's QR to check one out."
          />
        )}
        <div className="space-y-2">
          {current.map((loan) => (
            <div
              key={loan.id}
              className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{loan.title}</p>
                <p className="text-xs text-ink-muted">
                  Borrowed {new Date(loan.borrowed_at).toLocaleDateString()} &middot; due{" "}
                  {new Date(loan.due_at).toLocaleDateString()}
                </p>
              </div>
              <LoanStatusBadge isOverdue={loan.is_overdue} dueSoon={!loan.is_overdue} />
            </div>
          ))}
        </div>
      </Card>

      {past.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-base">Past borrows</h2>
          <div className="space-y-2">
            {past.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{loan.title}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(loan.borrowed_at).toLocaleDateString()} &rarr;{" "}
                    {loan.returned_at && new Date(loan.returned_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
