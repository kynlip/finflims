import { Metadata } from 'next';
import { getMoviesByCountryWithPagination } from '@/lib/data';

import { Pagination } from '@/components/Pagination';
import { MovieCard } from '@/components/MovieCard';
import { COUNTRY_NAMES } from '@/lib/constants';

const COUNTRY_DESCRIPTIONS: Record<string, string> = {
  'nhat-ban':
    'Khám phá kho tàng anime đến từ xứ sở hoa anh đào với những tác phẩm kinh điển và hiện đại nhất.',
  'au-my':
    'Những bộ phim hoạt hình chất lượng cao từ Hollywood và các hãng phim Âu Mỹ.',
  'trung-quoc':
    'Donghua - phim hoạt hình Trung Quốc với phong cách độc đáo và câu chuyện hấp dẫn.',
  'han-quoc':
    'Manhwa adaptation và các tác phẩm hoạt hình đặc sắc từ Hàn Quốc.',
};

interface CountryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CountryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const countryName =
    COUNTRY_NAMES[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    title: `Phim hoạt hình ${countryName} - Phim Hay Hơn Rổ`,
    description: `Danh sách phim hoạt hình ${countryName} chọn lọc chất lượng cao tại Phim Hay Hơn Rổ`,
  };
}

export default async function CountryPage({
  params,
  searchParams,
}: CountryPageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const limit = 24;

  const { movies, totalPages } = await getMoviesByCountryWithPagination(
    slug,
    currentPage,
    limit
  );
  const countryName =
    COUNTRY_NAMES[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  const description =
    COUNTRY_DESCRIPTIONS[slug] ||
    `Danh sách các bộ phim hoạt hình đến từ ${countryName}.`;

  return (
    <div className="bg-background text-foreground min-h-screen">


      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="border-border mb-8 border-b pb-4">
          <h1 className="text-primary font-serif text-3xl font-bold md:text-4xl">
            Quốc gia: <span className="text-foreground">{countryName}</span>
          </h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>

        {movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
              {movies.map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={`/quoc-gia/${slug}`}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <div className="mb-4 text-6xl">🌏</div>
            <h2 className="mb-2 text-xl font-bold md:text-2xl">
              Chưa có phim nào
            </h2>
            <p className="text-muted-foreground">
              Chúng tôi chưa cập nhật phim cho quốc gia này.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
