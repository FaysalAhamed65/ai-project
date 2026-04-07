"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

async function saveUsername(username: string) {
  const res = await fetch("/api/username", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error("Failed to save username");
}

export function UsernameGate({ children }: Props) {
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = window.localStorage.getItem("rating_username");
    const v = existing?.trim() ?? "";
    if (!v || v.length < 2) return;
    setSaving(true);
    void saveUsername(v)
      .then(() => {
        setReady(true);
      })
      .catch(() => {
        // If it fails, fall back to prompting again.
        window.localStorage.removeItem("rating_username");
      })
      .finally(() => {
        setSaving(false);
      });
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40">
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-gradient-to-br from-emerald-500 via-sky-500 to-fuchsia-500" />
      <div className="relative">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Enter your username to start rating</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          This will be saved for the admin report.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = username.trim();
            if (v.length < 2) {
              setError("Username must be at least 2 characters.");
              return;
            }
            setSaving(true);
            setError(null);
            try {
              await saveUsername(v);
              window.localStorage.setItem("rating_username", v);
              setReady(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save username");
            } finally {
              setSaving(false);
            }
          }}
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. user_01"
            className="w-full flex-1 rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-fuchsia-400 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-zinc-500"
            maxLength={40}
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Start"}
          </button>
        </form>
      </div>
    </div>
  );
}

