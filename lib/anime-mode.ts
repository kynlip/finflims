import { cookies } from "next/headers";

/** Cookie used to keep the selected catalogue mode during SSR and navigation. */
export const ANIME_MODE_COOKIE = "anime_mode";

/** Read the site-wide catalogue mode on the server. */
export async function isAnimeModeEnabled(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ANIME_MODE_COOKIE)?.value === "1";
}

/**
 * Add the animation-only constraint to a Mongo query when Anime mode is on.
 * The input is never mutated, which keeps the same query object safe to reuse
 * for sorting/counting and makes the helper usable from cached fetchers.
 */
export function applyAnimeFilter<T extends Record<string, unknown>>(
  query: T,
  animeMode: boolean,
): T {
  if (!animeMode) return query;
  return { ...query, type: "hoathinh" } as T;
}
