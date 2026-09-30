import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getMovieBySlug, getRelatedMovies } from '@/lib/data';
import { MovieDetailClient } from '@/components/MovieDetailClient';
import { MovieCard } from '@/components/MovieCard';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import type { Movie } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    return {
      title: 'Không tìm thấy phim',
    };
  }

  // ✅ Use thumb_url (landscape) for OG image - better for social sharing
  const ogImage = movie.thumb_url || movie.poster_url;

  return {
    title: `${movie.name} - Phim Hay Hơn Rổ`,
    description: (movie.content || movie.name).substring(0, 160),
    openGraph: {
      title: `${movie.name} - Xem ngay tại Phim Hay Hơn Rổ`,
      description: (movie.content || movie.name).substring(0, 160),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: movie.name,
        },
      ],
      type: 'video.movie',
      siteName: 'Phim Hay Hơn Rổ',
      url: `/phim/${slug}`,
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${movie.name} - Phim Hay Hơn Rổ`,
      description: (movie.content || movie.name).substring(0, 160),
      images: [ogImage],
    },
  };
}

// ✅ Separate component for related movies with Suspense
async function RelatedMoviesSection({ movie }: { movie: Movie }) {
  const relatedMovies = await getRelatedMovies(movie, 12);
  
  if (relatedMovies.length === 0) return null;
  
  return (
    <div className="relative z-20 border-t border-white/10 pt-8 mt-4">
      <div className="mb-6 flex items-center gap-2">
        <div className="h-6 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
        <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-white">
          Phim Cùng Thể Loại
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-5 lg:grid-cols-6">
        {relatedMovies.map((m) => (
          <div key={m._id} className="h-full">
            <MovieCard movie={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton for related movies
function RelatedMoviesSkeleton() {
  return (
    <div className="relative z-20 border-t border-white/10 pt-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-2/3 animate-pulse rounded-lg bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // ✅ Parallel data fetching - start both immediately
  const [movie, session] = await Promise.all([
    getMovieBySlug(slug),
    auth(),
  ]);

  if (!movie) {
    notFound();
  }

  const firstServer = movie.episodes?.[0];
  const firstServerItems = firstServer?.server_data || firstServer?.items || [];
  const firstEpisodeSlug = firstServerItems[0]?.slug || '1';
  const firstServerName = firstServer?.server_name || 'vip';

  // ✅ Use Suspense for related movies - don't block initial render
  return (
    <div className="bg-[#0a0a0a]">
      <MovieDetailClient
        movie={movie}
        firstServerName={firstServerName}
        firstEpisodeSlug={firstEpisodeSlug}
        isLoggedIn={!!session?.user}
      />
      
      {/* Related movies load separately without blocking */}
      <div className="container mx-auto px-4 pb-12 md:px-8">
        <Suspense fallback={<RelatedMoviesSkeleton />}>
          <RelatedMoviesSection movie={movie} />
        </Suspense>
      </div>
    </div>
  );
}
