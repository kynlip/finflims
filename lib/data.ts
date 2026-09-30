import clientPromise from "./mongodb";
import { Movie } from "./types";
import { toSlug, getServerSlug } from "./utils";
import type { Sort } from "mongodb";
import { cache } from "react";
import {
  FRANCHISES,
  type FranchiseFormat,
  type FranchiseSlug,
} from "./franchises";
import { applyAnimeFilter, isAnimeModeEnabled } from "./anime-mode";
import { getSiteSettings } from "./settings";

export type { Movie };
export { toSlug, getServerSlug };

const DB_NAME = process.env.MONGODB_DB_NAME || "captainmedia";
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || "kkphim";

// Helper function to normalize year field (can be string or number in DB)
function normalizeYear(year: unknown): number {
  if (typeof year === "number") return year;
  if (typeof year === "string") {
    const parsed = parseInt(year, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Card projection shared by the homepage/list fetchers (episodes excluded).
function mapMovieCard(movie: Record<string, unknown>): Movie {
  return {
    _id: String(movie._id),
    name: (movie.name as string) || (movie.origin_name as string),
    slug: movie.slug as string,
    thumb_url: movie.thumb_url as string,
    poster_url: movie.poster_url as string,
    origin_name: movie.origin_name as string,
    year: normalizeYear(movie.year),
    quality: movie.quality as string,
    lang: movie.lang as string,
    time: movie.time as string,
    episode_current: movie.episode_current as string,
    episode_total: movie.episode_total as string,
    category: movie.category as Movie["category"],
    country: movie.country as Movie["country"],
    content: movie.content as string,
    view: movie.view as number,
    imdb: movie.imdb as Movie["imdb"],
    tmdb: movie.tmdb as Movie["tmdb"],
    trailer_url: movie.trailer_url as string,
    episodes: [],
    status: movie.status as string,
    type: movie.type as string,
  };
}

export interface FranchiseFilters {
  format?: FranchiseFormat;
  category?: string;
  character?: string;
}

function getFranchiseSearchQuery(terms: readonly string[]) {
  const fields = ["name", "origin_name", "slug", "aliases"];
  const clauses = terms.flatMap((term) =>
    fields.map((field) => ({
      [field]: { $regex: escapeRegex(term), $options: "i" },
    })),
  );

  return { $or: clauses };
}

function getFranchiseQuery(
  slug: FranchiseSlug,
  filters: FranchiseFilters = {},
) {
  const collection = FRANCHISES[slug];
  const baseQuery: Record<string, unknown> = {
    type: "hoathinh",
    ...getFranchiseSearchQuery(collection.searchTerms),
  };

  if (collection.excludeSearchTerms?.length) {
    baseQuery.$nor = [getFranchiseSearchQuery(collection.excludeSearchTerms)];
  }

  const clauses: Record<string, unknown>[] = [baseQuery];

  if (filters.category) {
    clauses.push({ "category.slug": filters.category });
  }

  if (filters.format === "movie") {
    clauses.push({ episode_total: { $in: ["1", 1] } });
  } else if (filters.format === "series") {
    clauses.push({ episode_total: { $nin: ["1", 1] } });
  }

  if (filters.character) {
    const character = collection.characters.find(
      (item) => item.slug === filters.character,
    );

    if (character) {
      clauses.push(getFranchiseSearchQuery(character.searchTerms));
    }
  }

  return clauses.length === 1 ? baseQuery : { $and: clauses };
}

function mapFranchiseMovie(movie: {
  _id: { toString(): string };
  [key: string]: unknown;
}): Movie {
  return {
    _id: movie._id.toString(),
    name: (movie.name || movie.origin_name) as string,
    slug: movie.slug as string,
    thumb_url: movie.thumb_url as string,
    poster_url: movie.poster_url as string,
    origin_name: movie.origin_name as string,
    year: normalizeYear(movie.year),
    quality: movie.quality as string,
    lang: movie.lang as string,
    time: movie.time as string,
    episode_current: movie.episode_current as string,
    episode_total: movie.episode_total as string,
    category: movie.category as Movie['category'],
    country: movie.country as Movie['country'],
    content: movie.content as string | undefined,
    view: movie.view as number | undefined,
    imdb: movie.imdb as Movie['imdb'],
    tmdb: movie.tmdb as Movie['tmdb'],
    trailer_url: movie.trailer_url as string | undefined,
    episodes: [],
    status: movie.status as string | undefined,
    type: movie.type as string | undefined,
    is_manual: Boolean(movie.is_manual),
    is_pinned: Boolean(movie.is_pinned),
  };
}

import { unstable_cache } from "next/cache";

/**
 * Read the hero directly from Mongo on each request. Hero data must not cache
 * an empty result when the SSH tunnel is still starting; that stale empty
 * cache was the reason Normal Mode stayed on the loading fallback.
 */
async function getHeroMoviesFromDatabase(animeMode: boolean): Promise<Movie[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Get explicitly pinned hero slugs from site settings
    const siteSettings = await getSiteSettings();
    const heroSlugs = (siteSettings.adminHeroSlugs || []).filter(Boolean);

    // 2. Fetch movies matching heroSlugs (preserving admin priority order)
    const adminMovies: Array<{
      _id: { toString(): string };
      [key: string]: unknown;
    }> = [];

    if (heroSlugs.length > 0) {
      const found = await db
        .collection(COLLECTION_NAME)
        .find({ slug: { $in: heroSlugs } }, { projection: { episodes: 0 } })
        .toArray();

      const foundMap = new Map(found.map((m) => [m.slug, m]));
      for (const s of heroSlugs) {
        const m = foundMap.get(s);
        if (m) {
          adminMovies.push(m);
        }
      }
    }

    const adminSlugs = adminMovies.map((m) => m.slug as string);

    // 3. Fallback: If less than 6 movies, fetch latest / hot KKPhim movies to fill exactly 6
    let fallbackCrawlerMovies: Array<{
      _id: { toString(): string };
      [key: string]: unknown;
    }> = [];

    const neededSlots = Math.max(0, 6 - adminMovies.length);
    if (neededSlots > 0) {
      const crawlerQuery = applyAnimeFilter(
        adminSlugs.length > 0 ? { slug: { $nin: adminSlugs } } : {},
        animeMode,
      );

      fallbackCrawlerMovies = await db
        .collection(COLLECTION_NAME)
        .find(crawlerQuery, { projection: { episodes: 0 } })
        .sort({ "modified.time": -1, view: -1 })
        .limit(neededSlots)
        .toArray();
    }

    const combined = [...adminMovies, ...fallbackCrawlerMovies].slice(0, 6);

    return combined.map((movie) => ({
      _id: (movie._id as { toString(): string }).toString(),
      name: (movie.name || movie.origin_name) as string,
      slug: movie.slug as string,
      thumb_url: movie.thumb_url as string,
      poster_url: movie.poster_url as string,
      origin_name: movie.origin_name as string,
      year: normalizeYear(movie.year),
      quality: movie.quality as string,
      lang: movie.lang as string,
      time: movie.time as string,
      episode_current: movie.episode_current as string,
      episode_total: movie.episode_total as string,
      category: movie.category as Movie['category'],
      country: movie.country as Movie['country'],
      content: movie.content as string | undefined,
      view: movie.view as number | undefined,
      imdb: movie.imdb as Movie['imdb'],
      tmdb: movie.tmdb as Movie['tmdb'],
      trailer_url: movie.trailer_url as string | undefined,
      episodes: [],
      status: movie.status as string | undefined,
      type: movie.type as string | undefined,
      is_manual: Boolean(movie.is_manual),
      is_pinned: Boolean(movie.is_pinned),
    }));
  } catch (error) {
    console.error("Failed to fetch hero movies:", error);
    return [];
  }
}

/** Hero list follows the selected catalogue mode without stale caching. */
export async function getHeroMovies(): Promise<Movie[]> {
  return getHeroMoviesFromDatabase(await isAnimeModeEnabled());
}

/** Backward-compatible alias for existing callers. */
export const getHeroAnimations = getHeroMovies;

const getCachedMoviesByFilter = unstable_cache(
  async (
    type: "latest" | "hot" | "popular" | "completed" | "top_rated",
    limit: number = 10,
    animeMode: boolean,
  ): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      if (type === "latest") {
        // Query manual/pinned movies first
        const manualQuery: Record<string, unknown> = {
          $or: [
            { is_manual: true },
            { is_pinned: true },
            { slug: { $in: ["movie-conan", "doraemon-movie-1-45", "sieu-nhan-co-dong"] } },
          ],
        };
        if (animeMode) {
          manualQuery.type = "hoathinh";
        }

        const manualDocs = await db
          .collection(COLLECTION_NAME)
          .find(manualQuery, { projection: { episodes: 0 } })
          .sort({ "modified.time": -1, _id: -1 })
          .limit(limit)
          .toArray();

        const manualSlugs = manualDocs.map((m) => m.slug);
        const crawlerQuery = applyAnimeFilter(
          manualSlugs.length > 0 ? { slug: { $nin: manualSlugs } } : {},
          animeMode,
        );

        // Mongo treats .limit(0) as "no limit", so skip the query entirely
        // once the manual docs already fill the section.
        const crawlerSlots = Math.max(0, limit - manualDocs.length);
        const crawlerDocs = crawlerSlots
          ? await db
              .collection(COLLECTION_NAME)
              .find(crawlerQuery, { projection: { episodes: 0 } })
              .sort({ "modified.time": -1 })
              .limit(crawlerSlots)
              .toArray()
          : [];

        const movies = [...manualDocs, ...crawlerDocs];

        return movies.map((movie) => ({
          _id: movie._id.toString(),
          name: movie.name || movie.origin_name,
          slug: movie.slug,
          thumb_url: movie.thumb_url,
          poster_url: movie.poster_url,
          origin_name: movie.origin_name,
          year: normalizeYear(movie.year),
          quality: movie.quality,
          lang: movie.lang,
          time: movie.time,
          episode_current: movie.episode_current,
          episode_total: movie.episode_total,
          category: movie.category,
          country: movie.country,
          content: movie.content,
          view: movie.view,
          imdb: movie.imdb,
          tmdb: movie.tmdb,
          trailer_url: movie.trailer_url,
          episodes: [],
          status: movie.status,
          type: movie.type,
          is_manual: Boolean(movie.is_manual),
          is_pinned: Boolean(movie.is_pinned),
        }));
      }

      let sort: Sort = { "modified.time": -1 };
      const query: Record<string, unknown> = applyAnimeFilter({}, animeMode);

      if (type === "hot") {
        sort = { view: -1 };
      } else if (type === "popular") {
        sort = { view: -1, "tmdb.vote_count": -1 };
      } else if (type === "top_rated") {
        sort = { "tmdb.vote_average": -1 };
      } else if (type === "completed") {
        query.status = "completed";
      }

      const movies = await db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort(sort)
        .limit(limit)
        .toArray();

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
        type: movie.type,
        is_manual: Boolean(movie.is_manual),
        is_pinned: Boolean(movie.is_pinned),
      }));
    } catch (error) {
      console.error(`Failed to fetch ${type} movies:`, error);
      return [];
    }
  },
  ["movies-by-filter"],
  { revalidate: 60 },
);

export async function getMoviesByFilter(
  type: "latest" | "hot" | "popular" | "completed" | "top_rated",
  limit: number = 10,
): Promise<Movie[]> {
  return getCachedMoviesByFilter(type, limit, await isAnimeModeEnabled());
}

export const getCachedRandomMovies = unstable_cache(
  async (limit: number = 12, animeMode: boolean = true): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const baseQuery = applyAnimeFilter(
        {
          status: "completed",
          "episodes.0": { $exists: true },
        },
        animeMode,
      );

      let movies = await db
        .collection(COLLECTION_NAME)
        .aggregate([
          { $match: baseQuery },
          { $sample: { size: limit } },
        ])
        .toArray();

      if (!movies || movies.length === 0) {
        const fallbackQuery = applyAnimeFilter(
          {
            "episodes.0": { $exists: true },
          },
          animeMode,
        );
        movies = await db
          .collection(COLLECTION_NAME)
          .aggregate([
            { $match: fallbackQuery },
            { $sample: { size: limit } },
          ])
          .toArray();
      }

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: (movie.name || movie.origin_name) as string,
        slug: movie.slug as string,
        thumb_url: movie.thumb_url as string,
        poster_url: movie.poster_url as string,
        origin_name: movie.origin_name as string,
        year: normalizeYear(movie.year),
        quality: movie.quality as string,
        lang: movie.lang as string,
        time: movie.time as string,
        episode_current: movie.episode_current as string,
        episode_total: movie.episode_total as string,
        category: movie.category as Movie["category"],
        country: movie.country as Movie["country"],
        content: movie.content as string,
        view: movie.view as number,
        imdb: movie.imdb as Movie["imdb"],
        tmdb: movie.tmdb as Movie["tmdb"],
        trailer_url: movie.trailer_url as string,
        episodes: (movie.episodes as Movie["episodes"]) || [],
        status: movie.status as string,
        type: movie.type as string,
        is_manual: Boolean(movie.is_manual),
        is_pinned: Boolean(movie.is_pinned),
      }));
    } catch (error) {
      console.error("Failed to fetch random movies with episodes:", error);
      return [];
    }
  },
  ["random-movies-with-episodes"],
  { revalidate: 300 },
);

export async function getRandomMovies(limit: number = 12): Promise<Movie[]> {
  return getCachedRandomMovies(limit, await isAnimeModeEnabled());
}

export const getCachedManualUploadedMovies = unstable_cache(
  async (limit: number = 12, animeMode: boolean = true): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      // 1. Get explicitly pinned slugs from site settings
      const siteSettings = await getSiteSettings();
      const customSlugs = (siteSettings.adminFeaturedSlugs || []).filter(Boolean);

      // 2. Fetch movies matching custom slugs first (preserving customSlugs order)
      const customMovies: Array<{
        _id: { toString(): string };
        [key: string]: unknown;
      }> = [];
      if (customSlugs.length > 0) {
        const found = await db
          .collection(COLLECTION_NAME)
          .find({ slug: { $in: customSlugs } }, { projection: { episodes: 0 } })
          .toArray();

        const foundMap = new Map(found.map((m) => [m.slug, m]));
        for (const s of customSlugs) {
          const m = foundMap.get(s);
          if (m) {
            customMovies.push(m);
          }
        }
      }

      const existingSlugs = customMovies.map((m) => m.slug as string);

      // 3. Fetch any other manual movies
      const fallbackQuery: Record<string, unknown> = {
        $or: [
          { is_manual: true },
          { is_pinned: true },
          { slug: { $in: ["movie-conan", "doraemon-movie-1-45", "sieu-nhan-co-dong"] } },
        ],
      };
      if (existingSlugs.length > 0) {
        fallbackQuery.slug = { $nin: existingSlugs };
      }
      if (animeMode) {
        fallbackQuery.type = "hoathinh";
      }

      // Mongo treats .limit(0) as "no limit", so skip the query entirely
      // once the pinned slugs already fill the section.
      const fallbackSlots = Math.max(0, limit - customMovies.length);
      const manualMovies = fallbackSlots
        ? await db
            .collection(COLLECTION_NAME)
            .find(fallbackQuery, { projection: { episodes: 0 } })
            .sort({ "modified.time": -1, updatedAt: -1, _id: -1 })
            .limit(fallbackSlots)
            .toArray()
        : [];

      const combined = [...customMovies, ...manualMovies].slice(0, limit);

      return combined.map((movie) => ({
        _id: (movie._id as { toString(): string }).toString(),
        name: (movie.name || movie.origin_name) as string,
        slug: movie.slug as string,
        thumb_url: movie.thumb_url as string,
        poster_url: movie.poster_url as string,
        origin_name: movie.origin_name as string,
        year: normalizeYear(movie.year),
        quality: movie.quality as string,
        lang: movie.lang as string,
        time: movie.time as string,
        episode_current: movie.episode_current as string,
        episode_total: movie.episode_total as string,
        category: movie.category as Movie['category'],
        country: movie.country as Movie['country'],
        content: movie.content as string | undefined,
        view: movie.view as number | undefined,
        imdb: movie.imdb as Movie['imdb'],
        tmdb: movie.tmdb as Movie['tmdb'],
        trailer_url: movie.trailer_url as string | undefined,
        episodes: [],
        status: movie.status as string | undefined,
        type: movie.type as string | undefined,
        is_manual: true,
      }));
    } catch (error) {
      console.error("Failed to fetch manual uploaded movies:", error);
      return [];
    }
  },
  ["manual-uploaded-movies"],
  { revalidate: 60 },
);

export async function getManualUploadedMovies(limit: number = 12): Promise<Movie[]> {
  return getCachedManualUploadedMovies(limit, await isAnimeModeEnabled());
}

const getCachedMoviesByType = unstable_cache(
  async (
    movieType: "single" | "series" | "tvshows" | "hoathinh",
    limit: number = 12,
    animeMode: boolean,
  ): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const query = applyAnimeFilter({ type: movieType }, animeMode);
      const movies = await db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort({ "modified.time": -1 })
        .limit(limit)
        .toArray();

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
        type: movie.type,
      }));
    } catch (error) {
      console.error(`Failed to fetch ${movieType} movies:`, error);
      return [];
    }
  },
  ["movies-by-type"],
  { revalidate: 3600 },
);

export async function getMoviesByType(
  movieType: "single" | "series" | "tvshows" | "hoathinh",
  limit: number = 12,
): Promise<Movie[]> {
  return getCachedMoviesByType(movieType, limit, await isAnimeModeEnabled());
}

export interface PaginatedResult {
  movies: Movie[];
  totalMovies: number;
  totalPages: number;
  currentPage: number;
}

const getCachedMoviesByFilterWithPagination = unstable_cache(
  async (
  type: "latest" | "hot" | "popular" | "completed" | "top_rated",
    page: number = 1,
    limit: number = 24,
    animeMode: boolean,
  ): Promise<PaginatedResult> => {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    let sort: Sort = { "modified.time": -1 };
    const query: Record<string, unknown> = applyAnimeFilter({}, animeMode);

    if (type === "hot") {
      sort = { view: -1 };
    } else if (type === "popular") {
      sort = { view: -1, "tmdb.vote_count": -1 };
    } else if (type === "top_rated") {
      sort = { "tmdb.vote_average": -1 };
    } else if (type === "completed") {
      query.status = "completed";
    }

    const skip = (page - 1) * limit;

    const [movies, totalMovies] = await Promise.all([
      db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTION_NAME).countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalMovies / limit);

    return {
      movies: movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
        type: movie.type,
      })),
      totalMovies,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error(`Failed to fetch ${type} movies with pagination:`, error);
    return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
  }
  },
  ["movies-by-filter-pagination"],
  { revalidate: 3600 },
);

export async function getMoviesByFilterWithPagination(
  type: "latest" | "hot" | "popular" | "completed" | "top_rated",
  page: number = 1,
  limit: number = 24,
): Promise<PaginatedResult> {
  return getCachedMoviesByFilterWithPagination(
    type,
    page,
    limit,
    await isAnimeModeEnabled(),
  );
}

// ✅ FIX: Add React.cache() for per-request deduplication
// This prevents duplicate queries when called from both generateMetadata() and page()
export const getMovieBySlug = cache(
  async (slug: string): Promise<Movie | null> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const cleanSlug = (slug || "").trim().toLowerCase();
      const baseSlug = cleanSlug.replace(/-\d+(-\d+)*$/, "");

      let movie = await db.collection(COLLECTION_NAME).findOne({
        $or: [
          { slug: cleanSlug },
          { slug: slug },
          { aliases: cleanSlug },
          { aliases: slug },
        ],
      });

      if (!movie && baseSlug && baseSlug !== cleanSlug) {
        movie = await db.collection(COLLECTION_NAME).findOne({
          $or: [
            { slug: baseSlug },
            { aliases: baseSlug },
            { slug: { $regex: `^${baseSlug}`, $options: "i" } },
          ],
        });
      }

      if (!movie) return null;

      return {
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: movie.episodes || [],
        status: movie.status,
        type: movie.type,
      };
    } catch (error) {
      console.error(`Failed to fetch movie ${slug}:`, error);
      return null;
    }
  },
);

// ✅ Add cache for related movies to prevent duplicate queries
const getCachedRelatedMovies = cache(
  async (movie: Movie, limit: number = 5, animeMode: boolean): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      // Simple related logic: same category
      const categorySlugs = movie.category?.map((c) => c.slug) || [];

      if (categorySlugs.length === 0)
        return await getCachedMoviesByFilter("latest", limit, animeMode);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          "category.slug": { $in: categorySlugs },
          slug: { $ne: movie.slug }, // Exclude current movie
        })
        .project({ episodes: 0 })
        .sort({ view: -1 })
        .limit(limit)
        .toArray();

      return movies.map((m) => ({
        _id: m._id.toString(),
        name: m.name || m.origin_name,
        slug: m.slug,
        thumb_url: m.thumb_url,
        poster_url: m.poster_url,
        origin_name: m.origin_name,
        year: m.year,
        quality: m.quality,
        lang: m.lang,
        time: m.time,
        episode_current: m.episode_current,
        episode_total: m.episode_total,
        category: m.category,
        country: m.country,
        content: m.content,
        view: m.view,
        imdb: m.imdb,
        tmdb: m.tmdb,
        trailer_url: m.trailer_url,
        episodes: m.episodes || [],
        status: m.status,
        type: m.type,
      }));
    } catch (error) {
      console.error("Failed to fetch related movies:", error);
      return [];
    }
  },
);

export async function getRelatedMovies(
  movie: Movie,
  limit: number = 5,
): Promise<Movie[]> {
  return getCachedRelatedMovies(movie, limit, await isAnimeModeEnabled());
}

async function searchMoviesForMode(
  query: string,
  limit: number = 10,
  animeMode: boolean,
): Promise<Movie[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Sanitize input: escape special regex characters to prevent ReDoS
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Limit query length to prevent DoS
    const maxQueryLength = 100;
    const trimmedQuery = sanitizedQuery.slice(0, maxQueryLength);

    const movies = await db
      .collection(COLLECTION_NAME)
      .find({
        ...applyAnimeFilter({}, animeMode),
        $or: [
          { name: { $regex: trimmedQuery, $options: "i" } },
          { origin_name: { $regex: trimmedQuery, $options: "i" } },
          { slug: { $regex: trimmedQuery, $options: "i" } },
        ],
      })
      .project({ episodes: 0 })
      .sort({ "modified.time": -1 })
      .limit(limit)
      .toArray();

    return movies.map((movie) => ({
      _id: movie._id.toString(),
      name: movie.name || movie.origin_name,
      slug: movie.slug,
      thumb_url: movie.thumb_url,
      poster_url: movie.poster_url,
      origin_name: movie.origin_name,
      year: normalizeYear(movie.year),
      quality: movie.quality,
      lang: movie.lang,
      time: movie.time,
      episode_current: movie.episode_current,
      episode_total: movie.episode_total,
      category: movie.category,
      country: movie.country,
      content: movie.content,
      view: movie.view,
      imdb: movie.imdb,
      tmdb: movie.tmdb,
      trailer_url: movie.trailer_url,
      episodes: [],
      status: movie.status,
      type: movie.type,
    }));
  } catch (error) {
    console.error(`Failed to search movies with query "${query}":`, error);
    return [];
  }
}

export async function searchMovies(
  query: string,
  limit: number = 10,
): Promise<Movie[]> {
  return searchMoviesForMode(query, limit, await isAnimeModeEnabled());
}

export type SearchFilters = {
  category?: string; // Comma separated for multi-select
  country?: string; // Comma separated
  year?: string; // Comma separated
  lang?: string;
  sort?: string;
  limit?: number;
};

const getCachedSearchMoviesAdvanced = unstable_cache(
  async (
    query: string,
    filters: SearchFilters = {},
    animeMode: boolean,
  ): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const {
        category,
        country,
        year,
        lang,
        sort = "latest",
        limit = 24,
      } = filters;

      // Base query
      const dbQuery: Record<string, unknown> = applyAnimeFilter({}, animeMode);

      // Text search if query provided
      if (query && query.trim().length > 0) {
        const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const trimmedQuery = sanitizedQuery.slice(0, 100);

        dbQuery.$or = [
          { name: { $regex: trimmedQuery, $options: "i" } },
          { origin_name: { $regex: trimmedQuery, $options: "i" } },
          { slug: { $regex: trimmedQuery, $options: "i" } },
        ];
      }

      // Apply filters
      if (category) {
        const cats = category.split(",").filter(Boolean);
        if (cats.length > 0) {
          dbQuery["category.slug"] = { $in: cats };
        }
      }

      if (country) {
        const countries = country.split(",").filter(Boolean);
        if (countries.length > 0) {
          dbQuery["country.slug"] = { $in: countries };
        }
      }

      if (year) {
        const years = year
          .toString()
          .split(",")
          .map((y) => parseInt(y.trim()))
          .filter((y) => !isNaN(y));
        if (years.length > 0) {
          dbQuery.year = { $in: years };
        }
      }

      if (lang) {
        const langs = lang.split(",").filter(Boolean);
        if (langs.length > 0) {
          const langRegexes = langs.map((l) => {
            const slug = l.toLowerCase().trim();
            if (slug === "vietsub" || slug === "viet-sub") return /Vietsub/i;
            if (slug === "thuyet-minh") return /Thuyết Minh/i;
            if (slug === "long-tieng") return /Lồng Tiếng/i;
            return new RegExp(slug, "i");
          });

          if (langRegexes.length > 0) {
            dbQuery.lang = { $in: langRegexes };
          }
        }
      }

      // Apply sort
      let dbSort: Sort = { "modified.time": -1 };
      if (sort === "view") {
        dbSort = { view: -1 };
      } else if (sort === "popular") {
        dbSort = { view: -1, "tmdb.vote_count": -1 };
      } else if (sort === "rating") {
        dbSort = { "tmdb.vote_average": -1 };
      } else if (sort === "oldest") {
        dbSort = { "modified.time": 1 };
      }

      const movies = await db
        .collection(COLLECTION_NAME)
        .find(dbQuery, { projection: { episodes: 0 } })
        .sort(dbSort)
        .limit(limit)
        .toArray();

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
        type: movie.type,
      }));
    } catch (error) {
      console.error(
        `Failed to search movies advanced with query "${query}":`,
        error,
      );
      return [];
    }
  },
  ["search-movies-advanced"],
  { revalidate: 300 }, // Cache for 5 minutes
);

export async function searchMoviesAdvanced(
  query: string,
  filters: SearchFilters = {},
): Promise<Movie[]> {
  return getCachedSearchMoviesAdvanced(
    query,
    filters,
    await isAnimeModeEnabled(),
  );
}

const getCachedMoviesByCategory = unstable_cache(
  async (slug: string, limit: number, animeMode: boolean): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          "category.slug": slug,
        })
        .project({ episodes: 0 })
        .sort({ "modified.time": -1 })
        .limit(limit)
        .toArray();

      return movies.map(mapMovieCard);
    } catch (error) {
      console.error(`Failed to fetch movies by category ${slug}:`, error);
      return [];
    }
  },
  ["movies-by-category"],
  { revalidate: 60 },
);

export async function getMoviesByCategory(
  slug: string,
  limit: number = 24,
): Promise<Movie[]> {
  return getCachedMoviesByCategory(slug, limit, await isAnimeModeEnabled());
}

const getCachedMoviesByCategoryWithPagination = unstable_cache(
  async (
    slug: string,
    page: number = 1,
    limit: number = 24,
    animeMode: boolean,
  ): Promise<PaginatedResult> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const query = {
        ...applyAnimeFilter({}, animeMode),
        "category.slug": slug,
      };

      const skip = (page - 1) * limit;

      const [movies, totalMovies] = await Promise.all([
        db
          .collection(COLLECTION_NAME)
          .find(query, { projection: { episodes: 0 } })
          .sort({ "modified.time": -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection(COLLECTION_NAME).countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalMovies / limit);

      return {
        movies: movies.map((movie) => ({
          _id: movie._id.toString(),
          name: movie.name || movie.origin_name,
          slug: movie.slug,
          thumb_url: movie.thumb_url,
          poster_url: movie.poster_url,
          origin_name: movie.origin_name,
          year: normalizeYear(movie.year),
          quality: movie.quality,
          lang: movie.lang,
          time: movie.time,
          episode_current: movie.episode_current,
          episode_total: movie.episode_total,
          category: movie.category,
          country: movie.country,
          content: movie.content,
          view: movie.view,
          imdb: movie.imdb,
          tmdb: movie.tmdb,
          trailer_url: movie.trailer_url,
          episodes: [],
          status: movie.status,
          type: movie.type,
        })),
        totalMovies,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error(
        `Failed to fetch movies by category ${slug} with pagination:`,
        error,
      );
      return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
    }
  },
  ["movies-by-category-pagination"],
  { revalidate: 3600 },
);

export async function getMoviesByCategoryWithPagination(
  slug: string,
  page: number = 1,
  limit: number = 24,
): Promise<PaginatedResult> {
  return getCachedMoviesByCategoryWithPagination(
    slug,
    page,
    limit,
    await isAnimeModeEnabled(),
  );
}

export const getMoviesByFranchise = unstable_cache(
  async (slug: FranchiseSlug, limit: number = 12): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find(getFranchiseQuery(slug), { projection: { episodes: 0 } })
        .sort({ is_manual: -1, is_pinned: -1, view: -1, "modified.time": -1 })
        .limit(limit)
        .toArray();

      return movies.map((movie) => mapFranchiseMovie(movie));
    } catch (error) {
      console.error(`Failed to fetch ${slug} franchise movies:`, error);
      return [];
    }
  },
  ["movies-by-franchise"],
  { revalidate: 60 },
);

export interface FranchiseCategoryFacet {
  slug: string;
  name: string;
  count: number;
}

export interface FranchiseCharacterFacet {
  slug: string;
  label: string;
  count: number;
}

export interface FranchiseFacets {
  categories: FranchiseCategoryFacet[];
  characters: FranchiseCharacterFacet[];
}

export const getFranchiseFacets = unstable_cache(
  async (slug: FranchiseSlug): Promise<FranchiseFacets> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);
      const query = getFranchiseQuery(slug);
      const franchise = FRANCHISES[slug];

      const [categories, characterCounts] = await Promise.all([
        collection
          .aggregate([
            { $match: query },
            { $unwind: "$category" },
            {
              $group: {
                _id: "$category.slug",
                name: { $first: "$category.name" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1, name: 1 } },
            { $limit: 6 },
          ])
          .toArray(),
        Promise.all(
          franchise.characters.map(async (character) => ({
            slug: character.slug,
            label: character.label,
            count: await collection.countDocuments({
              $and: [query, getFranchiseSearchQuery(character.searchTerms)],
            }),
          })),
        ),
      ]);

      return {
        categories: categories.map((category) => ({
          slug: String(category._id),
          name: String(category.name),
          count: Number(category.count),
        })),
        characters: characterCounts.filter((character) => character.count > 0),
      };
    } catch (error) {
      console.error(`Failed to fetch ${slug} franchise facets:`, error);
      return { categories: [], characters: [] };
    }
  },
  ["franchise-facets"],
  { revalidate: 60 },
);

export const getMoviesByFranchiseWithPagination = unstable_cache(
  async (
    slug: FranchiseSlug,
    page: number = 1,
    limit: number = 24,
    filters: FranchiseFilters = {},
  ): Promise<PaginatedResult> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const query = getFranchiseQuery(slug, filters);
      const skip = (page - 1) * limit;

      const [movies, totalMovies] = await Promise.all([
        db
          .collection(COLLECTION_NAME)
          .find(query, { projection: { episodes: 0 } })
          .sort({ is_manual: -1, is_pinned: -1, view: -1, "modified.time": -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection(COLLECTION_NAME).countDocuments(query),
      ]);

      return {
        movies: movies.map((movie) => mapFranchiseMovie(movie)),
        totalMovies,
        totalPages: Math.ceil(totalMovies / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error(
        `Failed to fetch ${slug} franchise movies with pagination:`,
        error,
      );
      return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
    }
  },
  ["movies-by-franchise-pagination"],
  { revalidate: 60 },
);

const getCachedMoviesByCountry = unstable_cache(
  async (slug: string, limit: number, animeMode: boolean): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          "country.slug": slug,
        })
        .project({ episodes: 0 })
        .sort({ "modified.time": -1 })
        .limit(limit)
        .toArray();

      return movies.map(mapMovieCard);
    } catch (error) {
      console.error(`Failed to fetch movies by country ${slug}:`, error);
      return [];
    }
  },
  ["movies-by-country"],
  { revalidate: 60 },
);

export async function getMoviesByCountry(
  slug: string,
  limit: number = 24,
): Promise<Movie[]> {
  return getCachedMoviesByCountry(slug, limit, await isAnimeModeEnabled());
}

const getCachedMoviesByCountryWithPagination = unstable_cache(
  async (
  slug: string,
  page: number = 1,
  limit: number = 24,
  animeMode: boolean,
): Promise<PaginatedResult> => {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query = {
      ...applyAnimeFilter({}, animeMode),
      "country.slug": slug,
    };

    const skip = (page - 1) * limit;

    const [movies, totalMovies] = await Promise.all([
      db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort({ "modified.time": -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTION_NAME).countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalMovies / limit);

    return {
      movies: movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
        type: movie.type,
      })),
      totalMovies,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error(
      `Failed to fetch movies by country ${slug} with pagination:`,
      error,
    );
    return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
  }
  },
  ["movies-by-country-pagination"],
  { revalidate: 3600 },
);

export async function getMoviesByCountryWithPagination(
  slug: string,
  page: number = 1,
  limit: number = 24,
): Promise<PaginatedResult> {
  return getCachedMoviesByCountryWithPagination(
    slug,
    page,
    limit,
    await isAnimeModeEnabled(),
  );
}

const getCachedMoviesByYear = unstable_cache(
  async (year: number, limit: number, animeMode: boolean): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          year: year,
        })
        .project({ episodes: 0 })
        .sort({ "modified.time": -1 })
        .limit(limit)
        .toArray();

      return movies.map(mapMovieCard);
    } catch (error) {
      console.error(`Failed to fetch movies by year ${year}:`, error);
      return [];
    }
  },
  ["movies-by-year"],
  { revalidate: 60 },
);

export async function getMoviesByYear(
  year: number,
  limit: number = 24,
): Promise<Movie[]> {
  return getCachedMoviesByYear(year, limit, await isAnimeModeEnabled());
}

// Get Top View movies (most viewed)
const getCachedTopViewMovies = unstable_cache(
  async (limit: number = 10, animeMode: boolean): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          view: { $gt: 0 }, // Only movies with views
        })
        .project({ episodes: 0 })
        .sort({ view: -1 })
        .limit(limit)
        .toArray();

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
      }));
    } catch (error) {
      console.error("Failed to fetch top view movies:", error);
      return [];
    }
  },
  ["top-view-movies"],
  { revalidate: 3600 },
);

export async function getTopViewMovies(limit: number = 10): Promise<Movie[]> {
  return getCachedTopViewMovies(limit, await isAnimeModeEnabled());
}

// Get Top IMDb movies (highest rated with minimum votes for quality)
const getCachedTopImdbMovies = unstable_cache(
  async (
    limit: number = 10,
    minVotes: number = 100,
    animeMode: boolean,
  ): Promise<Movie[]> => {
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const movies = await db
        .collection(COLLECTION_NAME)
        .find({
          ...applyAnimeFilter({}, animeMode),
          "tmdb.vote_average": { $gt: 0 },
          "tmdb.vote_count": { $gte: minVotes }, // Minimum votes for credibility
        })
        .project({ episodes: 0 })
        .sort({ "tmdb.vote_average": -1, "tmdb.vote_count": -1 })
        .limit(limit)
        .toArray();

      return movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
      }));
    } catch (error) {
      console.error("Failed to fetch top IMDb movies:", error);
      return [];
    }
  },
  ["top-imdb-movies"],
  { revalidate: 3600 },
);

export async function getTopImdbMovies(
  limit: number = 10,
  minVotes: number = 100,
): Promise<Movie[]> {
  return getCachedTopImdbMovies(
    limit,
    minVotes,
    await isAnimeModeEnabled(),
  );
}

// Get Top IMDb movies with pagination
const getCachedTopImdbMoviesWithPagination = unstable_cache(
  async (
  page: number = 1,
  limit: number = 24,
  minVotes: number = 100,
  animeMode: boolean,
): Promise<PaginatedResult> => {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query = {
      ...applyAnimeFilter({}, animeMode),
      "tmdb.vote_average": { $gt: 0 },
      "tmdb.vote_count": { $gte: minVotes },
    };

    const skip = (page - 1) * limit;

    const [movies, totalMovies] = await Promise.all([
      db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort({ "tmdb.vote_average": -1, "tmdb.vote_count": -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTION_NAME).countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalMovies / limit);

    return {
      movies: movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
      })),
      totalMovies,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Failed to fetch top IMDb movies with pagination:", error);
    return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
  }
  },
  ["top-imdb-movies-pagination"],
  { revalidate: 3600 },
);

export async function getTopImdbMoviesWithPagination(
  page: number = 1,
  limit: number = 24,
  minVotes: number = 100,
): Promise<PaginatedResult> {
  return getCachedTopImdbMoviesWithPagination(
    page,
    limit,
    minVotes,
    await isAnimeModeEnabled(),
  );
}

// Get Top View movies with pagination
const getCachedTopViewMoviesWithPagination = unstable_cache(
  async (
  page: number = 1,
  limit: number = 24,
  animeMode: boolean,
): Promise<PaginatedResult> => {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const query = {
      ...applyAnimeFilter({}, animeMode),
      view: { $gt: 0 },
    };

    const skip = (page - 1) * limit;

    const [movies, totalMovies] = await Promise.all([
      db
        .collection(COLLECTION_NAME)
        .find(query, { projection: { episodes: 0 } })
        .sort({ view: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTION_NAME).countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalMovies / limit);

    return {
      movies: movies.map((movie) => ({
        _id: movie._id.toString(),
        name: movie.name || movie.origin_name,
        slug: movie.slug,
        thumb_url: movie.thumb_url,
        poster_url: movie.poster_url,
        origin_name: movie.origin_name,
        year: normalizeYear(movie.year),
        quality: movie.quality,
        lang: movie.lang,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        category: movie.category,
        country: movie.country,
        content: movie.content,
        view: movie.view,
        imdb: movie.imdb,
        tmdb: movie.tmdb,
        trailer_url: movie.trailer_url,
        episodes: [],
        status: movie.status,
      })),
      totalMovies,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Failed to fetch top view movies with pagination:", error);
    return { movies: [], totalMovies: 0, totalPages: 0, currentPage: 1 };
  }
  },
  ["top-view-movies-pagination"],
  { revalidate: 3600 },
);

export async function getTopViewMoviesWithPagination(
  page: number = 1,
  limit: number = 24,
): Promise<PaginatedResult> {
  return getCachedTopViewMoviesWithPagination(
    page,
    limit,
    await isAnimeModeEnabled(),
  );
}
