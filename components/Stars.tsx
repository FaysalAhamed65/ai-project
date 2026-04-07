"use client";

import { cn } from "@/lib/ui";

export function Stars({
  value,
  onChange,
  size = "md",
  disabled,
}: {
  value: number | null;
  onChange: (v: number) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const px = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "rounded-md p-1 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-50",
              "hover:bg-black/5 dark:hover:bg-white/10"
            )}
            aria-checked={value === n}
            role="radio"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(px, active ? "fill-amber-400" : "fill-zinc-300 dark:fill-zinc-700")}
              aria-hidden="true"
            >
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

