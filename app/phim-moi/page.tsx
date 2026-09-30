import { getMoviesByFilterWithPagination } from '@/lib/data';

import { MovieGrid } from '@/components/MovieGrid';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function LatestMoviesPage({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const limit = 24;

  const { movies, totalPages } = await getMoviesByFilterWithPagination(
    'latest',
    currentPage,
    limit
  );

  return (
    <main className="bg-background text-foreground min-h-screen pb-12">


      <div className="container mx-auto mt-24 px-4 md:px-8">
        <MovieGrid title="Mới Cập Nhật" movies={movies} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/phim-moi"
        />
      </div>
    </main>
  );
}
