"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/create/video";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error. Check your connection.");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted/70 focus:border-accent";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Name</span>
          <input name="name" required maxLength={80} autoComplete="name" className={field} placeholder="Your name" />
        </label>
      )}
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@example.com" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={field}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-fg underline">Sign in</Link></>
        ) : (
          <>New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-fg underline">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
