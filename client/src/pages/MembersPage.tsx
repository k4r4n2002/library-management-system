import { useEffect, useState } from "react";
import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { api } from "../lib/api";
import type { Member } from "../lib/types";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Field, Input } from "../components/Field";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";

export function MembersPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  function refresh(q = query) {
    api.get<Member[]>(`/api/members?q=${encodeURIComponent(q)}`).then(setMembers);
  }

  useEffect(() => {
    const handle = setTimeout(() => refresh(query), 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Members</h1>
          <p className="text-sm text-ink-muted">Everyone registered to borrow books.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <PlusIcon className="h-4 w-4" /> Add member
        </Button>
      </div>

      <Input placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {members && members.length === 0 && (
        <EmptyState icon={UsersIcon} title="No members found" description="Try a different search, or add a new member." />
      )}

      <Card className="divide-y divide-border-soft">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">{m.name}</p>
              <p className="text-xs text-ink-muted">{m.phone ?? m.email ?? "No contact info"}</p>
            </div>
            <span className="text-xs text-ink-muted">
              Joined {new Date(m.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </Card>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post("/api/members", { name, phone: phone || undefined, email: email || undefined });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add a member" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Phone" hint="Optional">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email" hint="Optional">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="flex-1">
            {submitting ? "Saving…" : "Save member"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
