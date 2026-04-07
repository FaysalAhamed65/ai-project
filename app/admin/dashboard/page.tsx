import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/adminAuth";
import { computeAdminStats } from "@/lib/adminStats";

function fmt(n: number | null) {
  if (n === null) return "—";
  return n.toFixed(2);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function peopleLabelFromCelebId(celebId: string) {
  const m = /^celeb(\d+)$/.exec(celebId);
  if (!m) return celebId;
  return `People ${m[1]}`;
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminDashboard({ searchParams }: PageProps) {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const stats = computeAdminStats();
  const celebIds = Array.from(new Set(stats.images.map((i) => i.celebId))).sort();
  const selectedCelebId = typeof searchParams?.celebId === "string" ? searchParams.celebId : "all";
  const filteredImages =
    selectedCelebId === "all" ? stats.images : stats.images.filter((i) => i.celebId === selectedCelebId);
  const sorted = [...filteredImages].sort((a, b) => a.id.localeCompare(b.id));

  const peopleStats = celebIds.map((id) => {
    const imgs = stats.images.filter((i) => i.celebId === id);
    const totalRatings = imgs.reduce((acc, i) => acc + i.totalRatings, 0);
    const weightedSum = imgs.reduce((acc, i) => acc + (i.average ?? 0) * i.totalRatings, 0);
    const avg = totalRatings > 0 ? weightedSum / totalRatings : null;
    const unratedImages = imgs.filter((i) => i.totalRatings === 0).length;
    return { celebId: id, totalRatings, average: avg, unratedImages };
  });

  const overallBuckets = [1, 2, 3, 4, 5].map((rating) => {
    const count = filteredImages.reduce((acc, img) => acc + (img.buckets.find((b) => b.rating === rating)?.count ?? 0), 0);
    return { rating, count };
  });
  const overallTotal = overallBuckets.reduce((acc, b) => acc + b.count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-200">
              ← Back to rating page
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Admin dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Full visibility: per-image distribution, averages, and unrated images.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <form method="get" className="flex items-center gap-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300" htmlFor="celebId">
                People
              </label>
              <select
                id="celebId"
                name="celebId"
                defaultValue={selectedCelebId}
                className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-white"
              >
                <option value="all">All</option>
                {celebIds.map((id) => (
                  <option key={id} value={id}>
                    {peopleLabelFromCelebId(id)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
              >
                View
              </button>
            </form>

            <form action="/api/admin/logout" method="post" className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Participants", value: stats.totals.totalParticipants, grad: "from-sky-500 to-indigo-600" },
            { label: "Total ratings", value: stats.totals.totalRatings, grad: "from-fuchsia-500 to-pink-600" },
            { label: "Completion emails sent", value: stats.totals.completedParticipants, grad: "from-emerald-500 to-teal-600" },
            { label: "Unrated images", value: stats.totals.unratedCount, grad: "from-amber-500 to-orange-600" },
          ].map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950"
            >
              <div className={`pointer-events-none absolute inset-0 opacity-10 bg-gradient-to-br ${k.grad}`} />
              <p className="relative text-xs font-semibold text-zinc-600 dark:text-zinc-300">{k.label}</p>
              <p className="relative mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950 lg:col-span-2">
            <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Per-people average (chart)</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Bar length is average rating out of 5.</p>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {peopleStats
                  .slice()
                  .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
                  .map((p) => {
                    const pct = p.average === null ? 0 : clamp01(p.average / 5) * 100;
                    return (
                      <div key={p.celebId} className="rounded-xl border border-black/5 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/40">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                            {peopleLabelFromCelebId(p.celebId)}
                          </p>
                          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{fmt(p.average)}</p>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{p.totalRatings} ratings</span>
                          <span>{p.unratedImages} unrated</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Overall rating distribution</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {selectedCelebId === "all" ? "All people" : peopleLabelFromCelebId(selectedCelebId)}
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-3">
                {overallBuckets.map((b) => {
                  const pct = overallTotal === 0 ? 0 : (b.count / overallTotal) * 100;
                  const grad =
                    b.rating === 1
                      ? "from-rose-500 to-red-600"
                      : b.rating === 2
                        ? "from-orange-500 to-amber-600"
                        : b.rating === 3
                          ? "from-yellow-400 to-lime-500"
                          : b.rating === 4
                            ? "from-sky-500 to-blue-600"
                            : "from-indigo-500 to-fuchsia-600";
                  return (
                    <div key={b.rating}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{b.rating}★</span>
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {b.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Total counted ratings: {overallTotal}</p>
            </div>
          </div>
        </div>

        {stats.unrated.length ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Images with zero ratings ({stats.unrated.length})
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {stats.unrated.slice(0, 18).map((img) => (
                <div key={img.id} className="overflow-hidden rounded-xl bg-white/60 dark:bg-black/20">
                  <div className="relative aspect-[4/5] w-full">
                    <Image src={img.src} alt={img.label} fill className="object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[11px] font-medium text-zinc-800 dark:text-zinc-200">{img.id}</p>
                  </div>
                </div>
              ))}
            </div>
            {stats.unrated.length > 18 ? (
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
                Showing 18 of {stats.unrated.length}. See the full list in the table below.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Participants</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Saved usernames for people who started rating.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <tr>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Participant ID</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {stats.participants.slice(0, 50).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{p.username ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">{p.id}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">
                      {new Date(p.last_seen_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.participants.length > 50 ? (
            <div className="border-t border-black/5 px-5 py-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              Showing 50 of {stats.participants.length}.
            </div>
          ) : null}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Per-people average</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Average is weighted by number of ratings across all 5 photos for each people.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <tr>
                  <th className="px-5 py-3">People</th>
                  <th className="px-5 py-3">Total ratings</th>
                  <th className="px-5 py-3">Avg</th>
                  <th className="px-5 py-3">Graph</th>
                  <th className="px-5 py-3">Unrated photos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {peopleStats.map((p) => (
                  <tr key={p.celebId} className={p.totalRatings === 0 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}>
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                      {peopleLabelFromCelebId(p.celebId)}
                    </td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">{p.totalRatings}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">{fmt(p.average)}</td>
                    <td className="px-5 py-3">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400"
                          style={{ width: `${p.average === null ? 0 : clamp01(p.average / 5) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">{p.unratedImages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Per-image stats{" "}
              {selectedCelebId === "all" ? null : (
                <span className="text-zinc-500 dark:text-zinc-400">({peopleLabelFromCelebId(selectedCelebId)})</span>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Serial order. Buckets show how many 1★..5★ ratings each image received.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <tr>
                  <th className="px-5 py-3">S.No</th>
                  <th className="px-5 py-3">Image</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Avg</th>
                  <th className="px-5 py-3">Graph</th>
                  <th className="px-5 py-3">1★</th>
                  <th className="px-5 py-3">2★</th>
                  <th className="px-5 py-3">3★</th>
                  <th className="px-5 py-3">4★</th>
                  <th className="px-5 py-3">5★</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {sorted.map((img, idx) => (
                  <tr key={img.id} className={img.totalRatings === 0 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                          <Image src={img.src} alt={img.label} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{img.label}</p>
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{img.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{img.totalRatings}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">{fmt(img.average)}</td>
                    <td className="px-5 py-3">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500"
                          style={{ width: `${img.average === null ? 0 : clamp01(img.average / 5) * 100}%` }}
                        />
                      </div>
                    </td>
                    {img.buckets.map((b) => (
                      <td key={b.rating} className="px-5 py-3 text-zinc-700 dark:text-zinc-200">
                        {b.count}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

