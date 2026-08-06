import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  BookOpenIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  RectangleStackIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { adminApi as api } from "../../lib/api";
import type { DashboardSummary, Loan } from "../../lib/types";
import { Card } from "../../components/Card";
import { LoanStatusBadge } from "../../components/Badge";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dueSoon, setDueSoon] = useState<Loan[]>([]);
  const [overdue, setOverdue] = useState<Loan[]>([]);

  useEffect(() => {
    api.get<DashboardSummary>("/api/dashboard/summary").then(setSummary);
    api.get<Loan[]>("/api/loans?status=due_soon").then(setDueSoon);
    api.get<Loan[]>("/api/loans?status=overdue").then(setOverdue);
  }, []);

  const stats: { label: string; value: number; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = summary
    ? [
        { label: "Titles", value: summary.totalBooks, icon: BookOpenIcon },
        { label: "Copies", value: summary.totalCopies, icon: RectangleStackIcon },
        { label: "Active loans", value: summary.activeLoans, icon: UsersIcon },
        { label: "Due in 2 days", value: summary.dueSoon, icon: ClockIcon },
        { label: "Overdue", value: summary.overdue, icon: ExclamationTriangleIcon },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="text-sm text-ink-muted">A snapshot of what's on loan and what needs attention.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold text-plum">{s.value}</p>
            <p className="text-xs text-ink-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <LoanList title="Overdue" loans={overdue} emptyText="Nothing overdue. Nice." />
      <LoanList title="Due within 2 days" loans={dueSoon} emptyText="Nothing due soon." />
    </div>
  );
}

function LoanList({ title, loans, emptyText }: { title: string; loans: Loan[]; emptyText: string }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-base">{title}</h2>
      {loans.length === 0 ? (
        <p className="text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{loan.title}</p>
                <p className="text-xs text-ink-muted">
                  {loan.member_name} &middot; due {new Date(loan.due_at).toLocaleDateString()}
                </p>
              </div>
              <LoanStatusBadge isOverdue={loan.is_overdue} dueSoon={!loan.is_overdue} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
