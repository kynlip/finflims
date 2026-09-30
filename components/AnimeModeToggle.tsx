"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ANIME_MODE_COOKIE = "anime_mode";

function readModeCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .some((value) => value === `${ANIME_MODE_COOKIE}=1`);
}

function writeModeCookie(enabled: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = enabled ? 60 * 60 * 24 * 365 : 0;
  document.cookie = `${ANIME_MODE_COOKIE}=${enabled ? "1" : "0"}; path=/; max-age=${maxAge}; samesite=lax`;
}

interface AnimeModeToggleProps {
  defaultEnabled?: boolean;
  className?: string;
}

/** Site-wide switch between the full catalogue and the animation catalogue. */
export function AnimeModeToggle({
  defaultEnabled = false,
  className = "",
}: AnimeModeToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(defaultEnabled);

  useEffect(() => {
    setEnabled(readModeCookie());
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    writeModeCookie(next);
    setEnabled(next);
    window.dispatchEvent(new CustomEvent("animemodechange", { detail: next }));
    router.refresh();
  }, [enabled, router]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Tắt chế độ Anime" : "Bật chế độ Anime"}
      title={enabled ? "Đang lọc phim hoạt hình · Bấm để xem tất cả phim" : "Bật chế độ chỉ xem phim hoạt hình"}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors",
        enabled
          ? "border-[#D4AF68] bg-[#D4AF68] text-[#0B1221]"
          : "border-white/20 bg-black/20 text-white/80 hover:border-[#D4AF68]/70 hover:text-[#D4AF68]",
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{enabled ? "Anime" : "Anime mode"}</span>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-[#0B1221] animate-pulse" : "bg-white/40"}`}
      />
    </button>
  );
}
