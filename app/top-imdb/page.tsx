import { getTopImdbMoviesWithPagination } from '@/lib/data';

import { RankingCard } from '@/components/RankingCard';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function TopImdbPage({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const limit = 10;

  const { movies, totalPages } = await getTopImdbMoviesWithPagination(
    currentPage,
    limit,
    100
  );

  return (
    <main className="bg-background text-foreground min-h-screen pb-12">


      <div className="container mx-auto px-4 pt-24 md:px-8">
        <div className="border-border mb-8 border-b pb-4">
          <h1 className="text-primary font-serif text-3xl font-bold md:text-4xl">
            Top IMDb
          </h1>
          <p className="text-muted-foreground mt-2">
            Những bộ phim hoạt hình được đánh giá cao nhất với tối thiểu 100
            lượt vote.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
          {movies.map((movie, index) => (
            <RankingCard
              key={movie._id}
              movie={movie}
              rank={(currentPage - 1) * limit + index + 1}
              type="rating"
            />
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/top-imdb"
        />
      </div>
    </main>
  );
}
