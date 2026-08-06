import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useMemberAuth } from "../../context/MemberAuthContext";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { Card } from "../../components/Card";
import { ApiError } from "../../lib/api";

export function MemberLoginPage() {
  const { name: currentName, loading, login } = useMemberAuth();
  const [form, setForm] = useState({ name: "", passcode: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && currentName) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.name, form.passcode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl">Library</h1>
        <p className="mt-1 text-sm text-ink-muted">Enter your name and passcode to sign in.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Name">
            <Input
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Passcode">
            <Input
              required
              inputMode="numeric"
              autoComplete="off"
              value={form.passcode}
              onChange={(e) => setForm({ ...form, passcode: e.target.value })}
            />
          </Field>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
