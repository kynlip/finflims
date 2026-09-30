import { notFound } from 'next/navigation';
import { getMovieBySlug, getRelatedMovies } from '@/lib/data';
import { getServerSlug, extractDirectStreamUrl } from '@/lib/utils';
import { WatchScreen } from '@/components/WatchScreen';
import { auth } from '@/auth';
import { addToHistory } from '@/app/actions/user-actions';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

// ... existing imports

interface PageProps {
  params: Promise<{
    slug: string;
    server: string;
    episode: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, episode } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    return {
      title: 'Không tìm thấy phim - Phim Hay Hơn Rổ',
    };
  }

  const cleanEpisodeName = (ep: string) => {
    return ep.replace(/^tap-|^ep-|^tập-/i, '').replace(/^0+/, '');
  };

  const title = `Xem phim ${movie.name} - Tập ${cleanEpisodeName(episode)} - Phim Hay Hơn Rổ`;
  const description = `Xem phim ${movie.name} tập ${cleanEpisodeName(episode)} chất lượng cao tại Phim Hay Hơn Rổ. ${(movie.content || '').substring(0, 150)}...`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [movie.thumb_url || movie.poster_url || '/opengraph-image.png'],
      type: 'video.episode',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [movie.thumb_url || movie.poster_url || '/opengraph-image.png'],
    },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { slug, server, episode } = await params;
  const [movie, session] = await Promise.all([
    getMovieBySlug(slug),
    auth(),
  ]);

  if (!movie) {
    notFound();
  }

  // Overlap the related-movies query with the ad/history work below instead
  // of serializing it after everything else.
  const relatedMoviesPromise = getRelatedMovies(movie);

  // Find matching episode logic
  let currentEpisodeData;
  let videoSource = '';
  let serverData;
  let nextEpisodeHref = undefined;
  let episodeName = episode;

  if (movie.episodes && movie.episodes.length > 0) {
    serverData =
      movie.episodes.find(
        (s) =>
          getServerSlug(s.server_name) === server ||
          s.server_name.toLowerCase().includes(server.toLowerCase()) ||
          server.toLowerCase().includes(getServerSlug(s.server_name))
      ) || movie.episodes[0];

    if (serverData) {
      const items = serverData.items || serverData.server_data || [];
      const cleanEp = (s: string) => s.toLowerCase().replace(/^tap-|^ep-|^tập-/i, '').trim();

      let currentIndex = items.findIndex(
        (e: { slug: string; name?: string }) =>
          e.slug === episode ||
          cleanEp(e.slug) === cleanEp(episode) ||
          e.slug === `tap-${episode}` ||
          `tap-${e.slug}` === episode ||
          (e.name && cleanEp(e.name) === cleanEp(episode))
      );

      if (currentIndex === -1 && items.length > 0) {
        currentIndex = 0;
      }

      if (currentIndex !== -1 && items[currentIndex]) {
        currentEpisodeData = items[currentIndex];
        const rawSource =
          currentEpisodeData.link_m3u8 ||
          currentEpisodeData.m3u8 ||
          currentEpisodeData.link_embed ||
          currentEpisodeData.embed ||
          '';
        videoSource = extractDirectStreamUrl(rawSource);
        episodeName = currentEpisodeData.name || `Tập ${episode}`;

        // Calculate Next Episode
        if (currentIndex < items.length - 1) {
          const nextEp = items[currentIndex + 1];
          nextEpisodeHref = `/xem/${slug}/${server}/${nextEp.slug}`;
        }
      }
    }
  }

  // Track watch history if logged in
  if (session?.user) {
    addToHistory({
      slug: movie.slug,
      name: movie.name,
      thumb_url: movie.thumb_url || movie.poster_url,
      episode: episodeName,
      types: [movie.type, ...(movie.category?.map((c) => c.slug) || [])].filter(
        (t): t is string => !!t
      ),
    });
  }

  const src =
    videoSource ||
    movie.trailer_url ||
    'https://media-files.vidstack.io/720p.mp4';
  const relatedMovies = await relatedMoviesPromise;

  return (
    <div className="bg-[#0a0a0a]">
      <WatchScreen
        movie={movie}
        videoSource={src}
        episode={episode}
        server={server}
        nextEpisodeHref={nextEpisodeHref}
        relatedMovies={relatedMovies}
        isLoggedIn={!!session?.user}
      />
    </div>
  );
}
