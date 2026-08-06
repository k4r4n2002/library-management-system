import { useEffect, useState } from "react";
import { NewspaperIcon, TrashIcon } from "@heroicons/react/24/outline";
import { memberApi } from "../../lib/api";
import type { Post } from "../../lib/types";
import { useMemberAuth } from "../../context/MemberAuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { EmptyState } from "../../components/EmptyState";

const textareaClass =
  "w-full rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function BlogPage() {
  const { memberId } = useMemberAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    memberApi.get<Post[]>("/api/blog").then(setPosts);
  }

  useEffect(refresh, []);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await memberApi.post("/api/blog", { title: title.trim() || undefined, body });
      setTitle("");
      setBody("");
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await memberApi.delete(`/api/blog/${id}`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Blog</h1>
        <p className="text-sm text-ink-muted">Reviews, updates, whatever's worth sharing.</p>
      </div>

      <Card className="space-y-3 p-5">
        <Field label="Title" hint="Optional">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Post">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={textareaClass} />
        </Field>
        <Button onClick={handleSubmit} disabled={submitting || !body.trim()}>
          {submitting ? "Posting…" : "Post"}
        </Button>
      </Card>

      {posts && posts.length === 0 && (
        <EmptyState icon={NewspaperIcon} title="No posts yet" description="Be the first to share something." />
      )}

      <div className="space-y-3">
        {posts?.map((post) => (
          <Card key={post.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                {post.title && <h3 className="text-base font-semibold text-plum">{post.title}</h3>}
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
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{post.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
