import { notFound, redirect } from 'next/navigation';
import { getMovieBySlug } from '@/lib/data';
import { getServerSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function WatchRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    notFound();
  }

  // Find first available server and episode
  if (movie.episodes && movie.episodes.length > 0) {
    const firstServer = movie.episodes[0];
    const serverSlug = getServerSlug(firstServer.server_name || '1');
    const items = firstServer.server_data || firstServer.items || [];

    if (items.length > 0) {
      const firstEpisode = items[0];
      const episodeSlug = firstEpisode.slug || '1';
      redirect(`/xem/${slug}/${serverSlug}/${episodeSlug}`);
    }
  }

  // If no episodes available yet, redirect to movie detail page
  redirect(`/phim/${slug}`);
}
