export interface Movie {
  _id: string;
  name: string;
  slug: string;
  thumb_url: string;
  poster_url: string;
  origin_name: string;
  year: number;
  quality: string;
  lang: string;
  time: string;
  episode_current: string;
  episode_total: string;
  type?: string;
  status?: string;
  category?: { name: string; slug: string }[];
  country?: { name: string; slug: string }[];
  content?: string;
  view?: number;
  is_manual?: boolean;
  is_pinned?: boolean;
  imdb?: { id: string };
  tmdb?: { id: string; type: string; vote_average: number; vote_count: number };
  trailer_url?: string;
  episodes?: {
    server_name: string;
    items?: {
      name: string;
      slug: string;
      embed?: string;
      m3u8?: string;
      link_embed?: string;
      link_m3u8?: string;
      time?: string;
    }[];
    server_data?: {
      name: string;
      slug: string;
      embed?: string;
      m3u8?: string;
      link_embed?: string;
      link_m3u8?: string;
      time?: string;
    }[];
  }[];
}
