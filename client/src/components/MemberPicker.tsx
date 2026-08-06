import { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { api } from "../lib/api";
import type { Member } from "../lib/types";
import { Input } from "./Field";
import { Button } from "./Button";

export function MemberPicker({ onSelect }: { onSelect: (member: Member) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get<Member[]>(`/api/members?q=${encodeURIComponent(query)}`).then(setResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleAdd() {
    if (!name.trim()) return;
    const member = await api.post<Member>("/api/members", { name, phone: phone || undefined });
    onSelect(member);
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search members by name or phone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!showAddForm && (
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border-soft px-3.5 py-2.5 text-left text-sm hover:border-primary hover:bg-primary-soft"
            >
              <span className="font-medium text-ink">{m.name}</span>
              <span className="text-ink-muted">{m.phone ?? "—"}</span>
            </button>
          ))}
          {results.length === 0 && <p className="px-1 py-2 text-sm text-ink-muted">No members found.</p>}
        </div>
      )}

      {!showAddForm ? (
        <Button type="button" variant="ghost" onClick={() => setShowAddForm(true)}>
          <PlusIcon className="h-4 w-4" /> Add a new member
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-border-soft p-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" onClick={handleAdd} disabled={!name.trim()}>
              Add &amp; select
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
