"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Login failed");
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto flex max-w-md flex-col px-4 py-14">
        <Link href="/" className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-200">
          ← Back to rating page
        </Link>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Admin login</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Enter the admin password to view ratings and stats.
          </p>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={loading || password.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

