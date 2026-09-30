// lib/kkphim.ts — Chuẩn hóa dữ liệu API KKPhim -> Document MongoDB

import { extractDirectStreamUrl } from './utils';

export const DEFAULT_CDN = 'https://phimimg.com';

export interface EpisodeItem {
  name: string;
  slug: string;
  filename?: string;
  link_embed: string;
  link_m3u8: string;
}

export interface EpisodeServer {
  server_name: string;
  server_data: EpisodeItem[];
}

export interface TaxonomyItem {
  id?: string;
  name: string;
  slug: string;
}

export interface TmdbInfo {
  type?: string | null;
  id?: string | null;
  season?: number | null;
  vote_average?: number;
  vote_count?: number;
}

export interface ImdbInfo {
  id?: string | null;
  vote_average?: number;
  vote_count?: number;
}

export interface MovieData {
  _id?: string;
  name: string;
  slug: string;
  origin_name: string;
  content: string;
  type: string;
  status: string;
  poster_url: string;
  thumb_url: string;
  is_copyright?: boolean;
  sub_docquyen?: boolean;
  chieurap?: boolean;
  is_published?: boolean;
  trailer_url?: string;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  quality?: string;
  lang?: string;
  notify?: string;
  showtimes?: string;
  year?: number;
  view?: number;
  actor?: string[];
  director?: string[];
  alternative_names?: string[];
  lang_key?: string[];
  category?: TaxonomyItem[];
  country?: TaxonomyItem[];
  episodes?: EpisodeServer[];
  tmdb?: TmdbInfo;
  imdb?: ImdbInfo;
  created?: { time: string };
  modified?: { time: string };
  updatedAt?: Date;
  crawledAt?: Date;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? '')).filter(Boolean);
}

export function absoluteImageUrl(url: string | undefined | null, cdnBase: string = DEFAULT_CDN): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = cdnBase.replace(/\/$/, '');
  if (!trimmed.includes('/')) {
    return `${base}/uploads/movies/${trimmed}`;
  }
  return `${base}/${trimmed.replace(/^\//, '')}`;
}

function normalizeTmdb(raw: unknown): TmdbInfo | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    type: raw.type == null ? null : String(raw.type),
    id: raw.id == null ? null : String(raw.id),
    season: raw.season == null ? null : asNumber(raw.season, 0) || null,
    vote_average: asNumber(raw.vote_average, 0),
    vote_count: asNumber(raw.vote_count, 0),
  };
}

function normalizeImdb(raw: unknown): ImdbInfo | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    id: raw.id == null ? null : String(raw.id),
    vote_average: asNumber(raw.vote_average, 0),
    vote_count: asNumber(raw.vote_count, 0),
  };
}

function normalizeTaxonomy(list: unknown): TaxonomyItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(isRecord)
    .map((tag) => {
      const slug = asString(tag.slug || tag.id);
      return {
        id: asString(tag.id || slug),
        name: asString(tag.name),
        slug,
      };
    })
    .filter((t) => t.slug || t.name);
}

function normalizeEpisodes(raw: unknown): EpisodeServer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((server) => {
    const rawData = server.server_data || server.items;
    const serverData: EpisodeItem[] = Array.isArray(rawData)
      ? rawData.filter(isRecord).map((ep) => {
          const rawM3U8 = asString(ep.link_m3u8 || ep.m3u8);
          const rawEmbed = asString(ep.link_embed || ep.embed);
          const cleanM3U8 = extractDirectStreamUrl(rawM3U8);
          const cleanEmbed = extractDirectStreamUrl(rawEmbed);
          const isDirectM3U8 =
            cleanM3U8.includes('.m3u8') ||
            cleanM3U8.includes('/hls/') ||
            cleanM3U8.includes('.mp4');
          const isEmbedM3U8 =
            cleanEmbed.includes('.m3u8') ||
            cleanEmbed.includes('/hls/') ||
            cleanEmbed.includes('.mp4');

          return {
            name: asString(ep.name),
            slug: asString(ep.slug),
            filename: asString(ep.filename || ep.name),
            link_embed: isDirectM3U8
              ? ''
              : isEmbedM3U8
              ? ''
              : cleanEmbed || cleanM3U8,
            link_m3u8: isDirectM3U8
              ? cleanM3U8
              : isEmbedM3U8
              ? cleanEmbed
              : cleanM3U8,
          };
        })
      : [];
    return {
      server_name: asString(server.server_name, 'Vietsub #1'),
      server_data: serverData,
    };
  });
}

export interface KkphimExtracted {
  movie: UnknownRecord;
  episodes: unknown;
  cdn: string;
  format: 'classic' | 'v1' | 'items';
}

export function extractKkphimDetail(detailData: unknown): KkphimExtracted | null {
  if (!isRecord(detailData)) return null;

  // v1 format: { status: "success", data: { item, APP_DOMAIN_CDN_IMAGE } }
  if (isRecord(detailData.data) && isRecord(detailData.data.item)) {
    const item = detailData.data.item;
    const cdn = asString(detailData.data.APP_DOMAIN_CDN_IMAGE, DEFAULT_CDN) || DEFAULT_CDN;
    return {
      movie: item,
      episodes: item.episodes ?? detailData.data.episodes ?? [],
      cdn,
      format: 'v1',
    };
  }

  // classic format: { status: true, movie, episodes }
  if (isRecord(detailData.movie)) {
    return {
      movie: detailData.movie,
      episodes: detailData.episodes ?? detailData.movie.episodes ?? [],
      cdn: asString(detailData.APP_DOMAIN_CDN_IMAGE, DEFAULT_CDN) || DEFAULT_CDN,
      format: 'classic',
    };
  }

  // rare items array format
  if (Array.isArray(detailData.items) && isRecord(detailData.items[0])) {
    const item = detailData.items[0];
    return {
      movie: item,
      episodes: detailData.episodes ?? item.episodes ?? [],
      cdn: asString(detailData.APP_DOMAIN_CDN_IMAGE, DEFAULT_CDN) || DEFAULT_CDN,
      format: 'items',
    };
  }

  return null;
}

export function isKkphimDetailOk(detailData: unknown): boolean {
  if (!isRecord(detailData)) return false;
  const s = detailData.status;
  if (s === true) return true;
  if (typeof s === 'string' && s.toLowerCase() === 'success') return true;
  return extractKkphimDetail(detailData) !== null;
}

export function normalizeKkphimMovie(detailData: unknown): MovieData | null {
  const extracted = extractKkphimDetail(detailData);
  if (!extracted) return null;

  const m = extracted.movie;
  const cdn = extracted.cdn || DEFAULT_CDN;
  const nowIso = new Date().toISOString();

  const slug = asString(m.slug);
  if (!slug) return null;

  const episodes = normalizeEpisodes(extracted.episodes);

  const movie: MovieData = {
    _id: m._id != null ? asString(m._id) : undefined,
    tmdb: normalizeTmdb(m.tmdb),
    imdb: normalizeImdb(m.imdb),
    created: {
      time: isRecord(m.created) ? asString(m.created.time, nowIso) : nowIso,
    },
    modified: {
      time: isRecord(m.modified) ? asString(m.modified.time, nowIso) : nowIso,
    },
    name: asString(m.name),
    slug,
    origin_name: asString(m.origin_name),
    content: asString(m.content),
    type: asString(m.type, 'hoathinh'),
    status: asString(m.status, 'ongoing'),
    poster_url: absoluteImageUrl(asString(m.poster_url), cdn),
    thumb_url: absoluteImageUrl(asString(m.thumb_url), cdn),
    is_copyright: asBool(m.is_copyright),
    sub_docquyen: asBool(m.sub_docquyen),
    chieurap: asBool(m.chieurap),
    is_published: asBool(m.is_published, true),
    trailer_url: asString(m.trailer_url),
    time: asString(m.time),
    episode_current: asString(m.episode_current, '1'),
    episode_total: asString(m.episode_total, '1'),
    quality: asString(m.quality, 'HD'),
    lang: asString(m.lang, 'Vietsub'),
    notify: asString(m.notify),
    showtimes: asString(m.showtimes),
    year: asNumber(m.year, 0),
    view: asNumber(m.view, 0),
    actor: asStringArray(m.actor),
    director: asStringArray(m.director),
    alternative_names: asStringArray(m.alternative_names),
    lang_key: asStringArray(m.lang_key),
    category: normalizeTaxonomy(m.category),
    country: normalizeTaxonomy(m.country),
    episodes,
  };

  return movie;
}
