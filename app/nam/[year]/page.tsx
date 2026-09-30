import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMoviesByYear } from '@/lib/data';

import { MovieCard } from '@/components/MovieCard';

interface YearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export async function generateMetadata({
  params,
}: YearPageProps): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Phim hoạt hình năm ${year}`,
    description: `Danh sách phim hoạt hình phát hành năm ${year}`,
  };
}

export default async function YearPage({ params }: YearPageProps) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (isNaN(year)) return notFound();

  const movies = await getMoviesByYear(year);

  return (
    <div className="bg-background text-foreground min-h-screen">


      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="border-border mb-8 border-b pb-4">
          <h1 className="text-primary font-serif text-3xl font-bold md:text-4xl">
            Năm phát hành: <span className="text-foreground">{year}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Danh sách các bộ phim hoạt hình ra mắt trong năm {year}.
          </p>
        </div>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <div className="mb-4 text-6xl">📅</div>
            <h2 className="mb-2 text-xl font-bold md:text-2xl">
              Chưa có phim nào
            </h2>
            <p className="text-muted-foreground">
              Chúng tôi chưa cập nhật phim cho năm này.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
