import { useEffect, useState } from "react";
import { CalendarIcon, MapPinIcon, MegaphoneIcon, TrashIcon } from "@heroicons/react/24/outline";
import { memberApi } from "../../lib/api";
import type { BulletinPost } from "../../lib/types";
import { useMemberAuth } from "../../context/MemberAuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { EmptyState } from "../../components/EmptyState";

const textareaClass =
  "w-full rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

// event_date comes back as a plain "YYYY-MM-DD" string (see server/src/db/pool.ts) —
// parsed manually into a local Date rather than new Date(string), which JS
// treats as UTC midnight and can render a day early in negative-UTC-offset zones.
function formatDateOnly(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

export function BulletinPage() {
  const { memberId } = useMemberAuth();
  const [posts, setPosts] = useState<BulletinPost[] | null>(null);
  const [form, setForm] = useState({ title: "", body: "", eventDate: "", eventTime: "", location: "" });
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    memberApi.get<BulletinPost[]>("/api/bulletin").then(setPosts);
  }

  useEffect(refresh, []);

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await memberApi.post("/api/bulletin", {
        title: form.title,
        body: form.body || undefined,
        eventDate: form.eventDate || undefined,
        eventTime: form.eventTime || undefined,
        location: form.location || undefined,
      });
      setForm({ title: "", body: "", eventDate: "", eventTime: "", location: "" });
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await memberApi.delete(`/api/bulletin/${id}`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Bulletin Board</h1>
        <p className="text-sm text-ink-muted">Announcements, meetups, whatever's happening.</p>
      </div>

      <Card className="space-y-3 p-5">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Details" hint="Optional">
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={2}
            className={textareaClass}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date" hint="Optional">
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            />
          </Field>
          <Field label="Time" hint="Optional">
            <Input
              type="time"
              value={form.eventTime}
              onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
            />
          </Field>
          <Field label="Location" hint="Optional">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
        </div>
        <Button onClick={handleSubmit} disabled={submitting || !form.title.trim()}>
          {submitting ? "Posting…" : "Post"}
        </Button>
      </Card>

      {posts && posts.length === 0 && (
        <EmptyState icon={MegaphoneIcon} title="Nothing posted yet" description="Post the first announcement or event." />
      )}

      <div className="space-y-3">
        {posts?.map((post) => (
          <Card key={post.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-plum">{post.title}</h3>
                <p className="text-xs text-ink-muted">
                  {post.author_name ?? "Unknown"} &middot; {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
              {post.member_id === memberId && (
                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  aria-label="Delete post"
                  className="cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {post.body && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{post.body}</p>}
            {(post.event_date || post.location) && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
                {post.event_date && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formatDateOnly(post.event_date)}
                    {post.event_time && ` at ${post.event_time.slice(0, 5)}`}
                  </span>
                )}
                {post.location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="h-3.5 w-3.5" />
                    {post.location}
                  </span>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
