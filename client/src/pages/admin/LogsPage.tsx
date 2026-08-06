import { useEffect, useState } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import { adminApi as api } from "../../lib/api";
import type { ScanLog } from "../../lib/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";

const EVENT_LABEL: Record<ScanLog["event_type"], string> = {
  book_ingest: "Book added",
  lend: "Lent",
  return: "Returned",
  unresolved: "Unrecognized scan",
};

const EVENT_TONE: Record<ScanLog["event_type"], "success" | "primary" | "warning" | "danger"> = {
  book_ingest: "success",
  lend: "primary",
  return: "success",
  unresolved: "danger",
};

export function LogsPage() {
  const [logs, setLogs] = useState<ScanLog[] | null>(null);

  useEffect(() => {
    api.get<ScanLog[]>("/api/dashboard/scan-logs").then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Activity</h1>
        <p className="text-sm text-ink-muted">
          Every scan, append-only — the full audit trail behind the catalog and loan state.
        </p>
      </div>

      {logs && logs.length === 0 && (
        <EmptyState icon={ClockIcon} title="No activity yet" description="Scans will show up here as they happen." />
      )}

      <Card className="divide-y divide-border-soft">
        {logs?.map((log) => (
          <div key={log.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">{log.title ?? log.scanned_code}</p>
              <p className="text-xs text-ink-muted">{new Date(log.scanned_at).toLocaleString()}</p>
            </div>
            <Badge tone={EVENT_TONE[log.event_type]}>{EVENT_LABEL[log.event_type]}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
