import { RatingFlow } from "@/components/RatingFlow";
import { UsernameGate } from "@/components/UsernameGate";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-rose-50 dark:from-black dark:via-zinc-950 dark:to-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[-6rem] h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl dark:bg-fuchsia-600/20" />
        <div className="absolute top-24 right-[-7rem] h-[30rem] w-[30rem] rounded-full bg-sky-400/30 blur-3xl dark:bg-sky-600/20" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_55%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_55%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.10),transparent_55%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40">
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30 dark:text-zinc-200">
                People Photo Rating • 250 photos • 1–5 stars
              </div>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                People Rating Study
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                Rate each photo (frontal view, neutral expression). Your progress is saved automatically.
              </p>
              <p className="mt-1 max-w-2xl text-xs text-zinc-600 dark:text-zinc-300">
                Tip: Choose the first rating that feels right — you’ll see one photo per page.
              </p>
            </div>
          </div>
        </header>

        <main>
          <div className="space-y-6">
            <UsernameGate>
              <RatingFlow />
            </UsernameGate>
          </div>
        </main>

        <footer className="mt-12 border-t border-black/5 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          Thank you for participating.
        </footer>
      </div>
    </div>
  );
}
