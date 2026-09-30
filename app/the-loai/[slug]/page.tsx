import { Suspense } from 'react';
import { Metadata } from 'next';
import { getMoviesByCategoryWithPagination } from '@/lib/data';

import { Pagination } from '@/components/Pagination';
import { MovieCard } from '@/components/MovieCard';
import { CATEGORY_NAMES } from '@/lib/constants';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoryName =
    CATEGORY_NAMES[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    title: `Phim ${categoryName} - Phim Hay Hơn Rổ`,
    description: `Xem phim ${categoryName} Vietsub, Thuyết minh mới nhất, cập nhật liên tục chất lượng cao tại Phim Hay Hơn Rổ.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  const categoryName =
    CATEGORY_NAMES[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

  return (
    <div className="bg-background text-foreground min-h-screen">


      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="border-border mb-8 border-b pb-4">
          <h1 className="text-primary font-serif text-3xl font-bold md:text-4xl">
            Thể loại: <span className="text-foreground">{categoryName}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Danh sách các bộ phim hoạt hình hấp dẫn thuộc thể loại này.
          </p>
        </div>

        <Suspense fallback={<CategorySkeleton />}>
          <CategoryContent slug={slug} page={page} />
        </Suspense>
      </main>
    </div>
  );
}

async function CategoryContent({
  slug,
  page,
}: {
  slug: string;
  page?: string;
}) {
  const currentPage = Number(page) || 1;
  const limit = 24;
  const { movies, totalPages } = await getMoviesByCategoryWithPagination(
    slug,
    currentPage,
    limit
  );

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
        <div className="mb-4 text-6xl">🎬</div>
        <h2 className="mb-2 text-xl font-bold md:text-2xl">Chưa có phim nào</h2>
        <p className="text-muted-foreground">
          Chúng tôi đang cập nhật phim cho thể loại này. Quay lại sau nhé!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={`/the-loai/${slug}`}
      />
    </>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="bg-muted/20 aspect-2/3 animate-pulse rounded-xl" />
            <div className="bg-muted/20 h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-muted/20 h-3 w-1/2 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
