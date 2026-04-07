"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Stars } from "@/components/Stars";
import { cn } from "@/lib/ui";

type SessionImage = {
  id: string;
  celebId: string;
  src: string;
  label: string;
  rating: number | null;
};

type SessionPayload = {
  participantId: string;
  total: number;
  completed: number;
  pageStart: number;
  pageSize: number;
  images: SessionImage[];
  isFinished: boolean;
};

async function getSession(): Promise<SessionPayload> {
  const res = await fetch("/api/session", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

async function submitRating(imageId: string, rating: number) {
  const res = await fetch("/api/rate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId, rating }),
  });
  if (!res.ok) throw new Error("Failed to save rating");
  return res.json() as Promise<{ ok: true; isFinished: boolean }>;
}

export function RatingFlow() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const s = await getSession();
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onRate(imageId: string, rating: number) {
    if (!session) return;
    setSavingId(imageId);
    setError(null);
    try {
      await submitRating(imageId, rating);
      // Move immediately to the next photo (session API returns the next unrated item).
      await refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rating");
    } finally {
      setSavingId(null);
    }
  }

  if (loading && !session) {
    return (
      <div className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
        Loading images…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-10 text-center text-sm text-red-600">
        {error ?? "Failed to load."}
      </div>
    );
  }

  const percent = Math.round((session.completed / Math.max(1, session.total)) * 100);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Progress: <span className="font-medium text-zinc-900 dark:text-white">{session.completed}</span> /{" "}
            {session.total} ({percent}%)
          </p>
          <div className="mt-2 h-2 w-full max-w-lg overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
          >
            Admin
          </Link>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {session.isFinished ? (
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Thanks — you’re done.</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Your ratings are saved. You can close this tab.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            View summary
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {session.images[0] ? (
            <div
              key={session.images[0].id}
              className={cn(
                "mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950",
                savingId === session.images[0].id ? "opacity-75" : "opacity-100"
              )}
            >
              <div className="relative h-[70vh] w-full bg-zinc-100 dark:bg-zinc-900 sm:h-[75vh]">
                <Image
                  src={session.images[0].src}
                  alt={session.images[0].label}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-contain"
                  priority={false}
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{session.images[0].label}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Rate from 1 to 5</p>
                  </div>
                  <span className="rounded-full bg-black/5 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                    {session.images[0].id}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Stars
                    value={session.images[0].rating}
                    onChange={(v) => void onRate(session.images[0]!.id, v)}
                    disabled={savingId !== null}
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {savingId ? "Saving…" : " "}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">No image found.</div>
          )}
        </>
      )}
    </div>
  );
}

