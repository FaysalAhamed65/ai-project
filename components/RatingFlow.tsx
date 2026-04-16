"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type AspectPreset = "3 / 5" | "1 / 1" | "100 / 167";

function pickAspectPreset(width: number, height: number): AspectPreset {
  const ratio = width / height;
  const presets: Array<{ key: AspectPreset; value: number }> = [
    { key: "3 / 5", value: 3 / 5 },
    { key: "1 / 1", value: 1 / 1 },
    { key: "100 / 167", value: 100 / 167 },
  ];

  let best = presets[0]!;
  let bestDiff = Math.abs(ratio - best.value);
  for (const p of presets) {
    const diff = Math.abs(ratio - p.value);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.key;
}

async function getSession(cursor: number | null): Promise<SessionPayload> {
  const qs = cursor === null ? "" : `?cursor=${cursor}`;
  const res = await fetch(`/api/session${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

async function submitRating(imageId: string, rating: number) {
  const res = await fetch("/api/rate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId, rating }),
  });
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    let msg = "Failed to save rating";
    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      const maybeError = obj.error;
      if (typeof maybeError === "string" && maybeError.trim().length > 0) msg = maybeError;
    }
    throw new Error(msg);
  }
  return payload as Promise<{ ok: true; isFinished: boolean }>;
}

async function resetParticipant() {
  const res = await fetch("/api/reset", { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset");
}

export function RatingFlow() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [imageAspectById, setImageAspectById] = useState<Record<string, AspectPreset>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getSession(cursor);
      setSession(s);
      // Sync cursor with server-selected index on first load.
      if (cursor === null) setCursor(s.pageStart);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onRate(imageId: string, rating: number) {
    if (!session) return;
    setSavingId(imageId);
    setError(null);
    try {
      await submitRating(imageId, rating);
      // Move to next index, but allow going back with Previous.
      const next = Math.min((cursor ?? session.pageStart) + 1, Math.max(0, session.total));
      setCursor(next);
      const s = await getSession(next);
      setSession(s);
      setCursor(s.pageStart);
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
  const currentIndex = cursor ?? session.pageStart;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex + 1 < session.total;

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
            disabled={!canPrev || savingId !== null}
            onClick={async () => {
              const prev = Math.max(0, currentIndex - 1);
              setCursor(prev);
              setLoading(true);
              setError(null);
              try {
                const s = await getSession(prev);
                setSession(s);
                setCursor(s.pageStart);
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
              } finally {
                setLoading(false);
              }
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium shadow-sm transition",
              canPrev && savingId === null
                ? "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                : "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || savingId !== null}
            onClick={async () => {
              const next = Math.min(currentIndex + 1, Math.max(0, session.total));
              setCursor(next);
              setLoading(true);
              setError(null);
              try {
                const s = await getSession(next);
                setSession(s);
                setCursor(s.pageStart);
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
              } finally {
                setLoading(false);
              }
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium shadow-sm transition",
              canNext && savingId === null
                ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                : "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            Next
          </button>
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
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              View summary
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await resetParticipant();
                  window.localStorage.removeItem("rating_username");
                  window.location.reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to reset");
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
            >
              Start again (new user)
            </button>
          </div>
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
                "mx-auto w-fit max-w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950",
                savingId === session.images[0].id ? "opacity-75" : "opacity-100"
              )}
            >
              <div className="bg-zinc-100 dark:bg-zinc-900">
                <div
                  className="relative h-[70vh] max-w-[calc(100vw-2rem)] sm:h-[75vh]"
                  style={{
                    aspectRatio: imageAspectById[session.images[0].id] ?? "3 / 5",
                  }}
                >
                <Image
                  src={session.images[0].src}
                  alt={session.images[0].label}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-contain"
                  priority={false}
                  onLoad={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    const { naturalWidth, naturalHeight } = img;
                    if (!naturalWidth || !naturalHeight) return;
                    const aspectPreset = pickAspectPreset(naturalWidth, naturalHeight);
                    setImageAspectById((prev) => {
                      if (prev[session.images[0]!.id] === aspectPreset) return prev;
                      return { ...prev, [session.images[0]!.id]: aspectPreset };
                    });
                  }}
                />
              </div>
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

