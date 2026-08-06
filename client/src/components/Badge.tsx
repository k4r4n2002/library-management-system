type Tone = "success" | "warning" | "danger" | "primary" | "neutral";

const styles: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  primary: "bg-primary-soft text-primary",
  neutral: "bg-gray-100 text-ink-muted",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function CopyStatusBadge({ status }: { status: "available" | "borrowed" | "retired" }) {
  if (status === "available") return <Badge tone="success">Available</Badge>;
  if (status === "borrowed") return <Badge tone="primary">Borrowed</Badge>;
  return <Badge tone="neutral">Retired</Badge>;
}

export function LoanStatusBadge({ isOverdue, dueSoon }: { isOverdue?: boolean; dueSoon?: boolean }) {
  if (isOverdue) return <Badge tone="danger">Overdue</Badge>;
  if (dueSoon) return <Badge tone="warning">Due soon</Badge>;
  return <Badge tone="success">On time</Badge>;
}
