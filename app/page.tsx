import { Suspense } from 'react';
import {
  getMoviesByFilter,
  getMoviesByCountry,
  getTopViewMovies,
  getTopImdbMovies,
  getMoviesByCategory,
  getMoviesByYear,
  getMoviesByFranchise,
  getMoviesByType,
  getHeroMovies,
  getManualUploadedMovies,
  getRandomMovies,
} from '@/lib/data';
import type { FranchiseSlug } from '@/lib/franchises';
import { HeroSlider } from '@/components/HeroSlider';
import { MovieSection } from '@/components/MovieSection';
import { HorizontalMovieSection } from '@/components/HorizontalMovieSection';
import { RankingSection } from '@/components/RankingSection';
import { RandomMovieSection } from '@/components/RandomMovieSection';
import { HomeCommentsSection } from '@/components/HomeCommentsSection';
import { ContinueWatchingSection } from '@/components/ContinueWatchingSection';
import { FranchiseSection } from '@/components/FranchiseSection';
import { isAnimeModeEnabled } from '@/lib/anime-mode';

const HOME_SECTION_LIMIT = 12;

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [animeMode, heroMovies] = await Promise.all([
    isAnimeModeEnabled(),
    getHeroMovies(),
  ]);

  return (
    <main className="bg-background text-foreground min-h-screen overflow-x-hidden pb-12">


      {/* Anime Hero Section - Immersive Experience */}
      <Suspense
        fallback={
          <div className="h-[75vh] min-h-145 w-full animate-pulse bg-[#070b14] flex items-center justify-center">
            <div className="text-center text-slate-500 font-medium">Đang tải phim nổi bật...</div>
          </div>
        }
      >
        <HeroSlider
          movies={heroMovies}
          ariaLabel={animeMode ? 'Anime nổi bật' : 'Phim Mới'}
        />
      </Suspense>

      {/* Content Sections - Streamed via Suspense */}
      <div className="relative z-20 space-y-8 pb-20">
        {animeMode ? (
          <>
            {/* 🎬 Đang Xem Tiếp */}
            <div className="cv-section container mx-auto mt-8 px-4 md:mt-12 md:px-8">
              <ContinueWatchingSection />
            </div>

            {/* 1. Phim Admin Upload */}
            <div className="container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Phim Admin Upload" />}>
                <AdminUploadedMovies />
              </Suspense>
            </div>

            {/* 2. Latest Movies */}
            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Mới Cập Nhật" />}>
                <LatestMovies />
              </Suspense>
            </div>

            {/* 2. Series được xem nhiều */}
            {animeMode && (
              <>
                <div className="cv-section container mx-auto px-4 md:px-8">
                  <Suspense fallback={<SectionSkeleton title="Conan" />}>
                    <FeaturedFranchise franchise="conan" />
                  </Suspense>
                </div>

                <div className="cv-section container mx-auto px-4 md:px-8">
                  <Suspense fallback={<SectionSkeleton title="Doraemon" />}>
                    <FeaturedFranchise franchise="doraemon" />
                  </Suspense>
                </div>

                <div className="cv-section container mx-auto px-4 md:px-8">
                  <Suspense fallback={<SectionSkeleton title="Siêu Nhân & Tokusatsu" />}>
                    <FeaturedFranchise franchise="sieu-nhan" />
                  </Suspense>
                </div>
              </>
            )}

            {/* 2. Anime 2026 */}
        {animeMode && (
          <>
            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Anime 2026" />}>
                <Movies2026 />
              </Suspense>
            </div>

            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Hoạt Hình Nhật Bản" />}>
                <CountryMovies slug="nhat-ban" title="Hoạt Hình Nhật Bản" />
              </Suspense>
            </div>

            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Hoạt Hình Trung Quốc" />}>
                <CountryMovies slug="trung-quoc" title="Hoạt Hình Trung Quốc" />
              </Suspense>
            </div>
          </>
        )}

        {!animeMode && (
          <>
            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Phim Hàn Quốc" />}>
                <CountryMovies slug="han-quoc" title="Phim Hàn Quốc" />
              </Suspense>
            </div>

            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Phim Trung Quốc" />}>
                <CountryMovies slug="trung-quoc" title="Phim Trung Quốc" />
              </Suspense>
            </div>
          </>
        )}

        {/* 5. Phim Ngẫu Nhiên */}
        <div className="cv-section container mx-auto px-4 md:px-8">
          <Suspense fallback={<SectionSkeleton title="Phim Ngẫu Nhiên" />}>
            <RandomMovies />
          </Suspense>
        </div>

        {/* 6. Ranking Section */}
        <div>
          <Suspense
            fallback={
              <div className="bg-secondary/10 h-125 w-full animate-pulse" />
            }
          >
            <RankingMovies />
          </Suspense>
        </div>

        {/* 7. Bình Luận & Thảo Luận Cộng Đồng (Đặt giữa trang) */}
        <div className="cv-section container mx-auto px-4 md:px-8">
          <Suspense fallback={<SectionSkeleton title="Bình Luận & Thảo Luận" />}>
            <HomeComments />
          </Suspense>
        </div>

        {animeMode ? (
          <>
            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Hoạt Hình Âu Mỹ" />}>
                <CountryMovies slug="au-my" title="Hoạt Hình Âu Mỹ" />
              </Suspense>
            </div>

            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Hoạt Hình Hàn Quốc" />}>
                <CountryMovies slug="han-quoc" title="Hoạt Hình Hàn Quốc" />
              </Suspense>
            </div>

            <div className="cv-section container mx-auto px-4 md:px-8">
              <Suspense fallback={<SectionSkeleton title="Recap Anime 2025" />}>
                <Movies2025 />
              </Suspense>
            </div>
          </>
        ) : (
          <div className="cv-section container mx-auto px-4 md:px-8">
            <Suspense fallback={<SectionSkeleton title="Phim Âu Mỹ" />}>
              <CountryMovies slug="au-my" title="Phim Âu Mỹ" />
            </Suspense>
          </div>
        )}

        {/* 11-13. Category Sections - Horizontal Style (Xen kẽ với Phổ Biến) */}
        <div className="bg-muted/20 space-y-8 py-8">
          {/* Hành Động */}
          <div className="cv-section container mx-auto px-4 md:px-8">
            <Suspense
              fallback={<HorizontalSectionSkeleton title="Hành Động" />}
            >
              <ActionMovies />
            </Suspense>
          </div>

          {/* Phổ Biến */}
          <div className="cv-section container mx-auto px-4 md:px-8">
            <Suspense fallback={<SectionSkeleton title="Phổ Biến" />}>
              <PopularMovies />
            </Suspense>
          </div>

          {/* Phiêu Lưu */}
          <div className="cv-section container mx-auto px-4 md:px-8">
            <Suspense
              fallback={<HorizontalSectionSkeleton title="Phiêu Lưu" />}
            >
              <AdventureMovies />
            </Suspense>
          </div>

          {/* Hài Hước */}
          <div className="cv-section container mx-auto px-4 md:px-8">
            <Suspense
              fallback={<HorizontalSectionSkeleton title="Hài Hước" columns={3} />}
            >
              <ComedyMovies />
            </Suspense>
          </div>
        </div>

        {/* 14. Hoàn Tất */}
        <div className="cv-section container mx-auto px-4 md:px-8">
          <Suspense fallback={<SectionSkeleton title="Hoàn Tất" />}>
            <CompletedMovies />
          </Suspense>
        </div>
          </>
        ) : (
          <NormalModeSections />
        )}
      </div>
    </main>
  );
}

// --- Async Components for Streaming ---

async function NormalModeSections() {
  return (
    <>
      {/* 🎬 Đang Xem Tiếp */}
      <div className="cv-section container mx-auto mt-8 px-4 md:mt-12 md:px-8">
        <ContinueWatchingSection />
      </div>

      {/* 1. Phim Admin Upload */}
      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Admin Upload" />}>
          <AdminUploadedMovies />
        </Suspense>
      </div>

      {/* 2. Mới Cập Nhật */}
      <div className="cv-section container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Mới Cập Nhật" />}>
          <LatestMovies />
        </Suspense>
      </div>

      {/* 2. Phim Bộ & Phim Lẻ */}
      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Bộ" />}>
          <TypeMovies movieType="series" title="Phim Bộ" />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Lẻ" />}>
          <TypeMovies movieType="single" title="Phim Lẻ" />
        </Suspense>
      </div>

      {/* 🏆 3. BẢNG XẾP HẠNG (Top View & Top IMDb) */}
      <div className="my-6">
        <Suspense
          fallback={
            <div className="bg-secondary/10 h-125 w-full animate-pulse" />
          }
        >
          <RankingMovies />
        </Suspense>
      </div>

      {/* 4. Phim theo quốc gia */}
      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Trung Quốc" />}>
          <CountryMovies slug="trung-quoc" title="Phim Trung Quốc" />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Hàn Quốc" />}>
          <CountryMovies slug="han-quoc" title="Phim Hàn Quốc" />
        </Suspense>
      </div>

      {/* 5. Phim Ngẫu Nhiên */}
      <div className="cv-section container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Ngẫu Nhiên" />}>
          <RandomMovies />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Âu Mỹ" />}>
          <CountryMovies slug="au-my" title="Phim Âu Mỹ" />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Nhật Bản" />}>
          <CountryMovies slug="nhat-ban" title="Phim Nhật Bản" />
        </Suspense>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Phim Thái Lan" />}>
          <CountryMovies slug="thai-lan" title="Phim Thái Lan" />
        </Suspense>
      </div>

      {/* 6. Bình Luận & Thảo Luận Cộng Đồng */}
      <div className="cv-section container mx-auto px-4 md:px-8">
        <Suspense fallback={<SectionSkeleton title="Bình Luận & Thảo Luận" />}>
          <HomeComments />
        </Suspense>
      </div>
    </>
  );
}

async function HomeComments() {
  const { getRecentCommunityReviews } = await import('@/app/actions/user-actions');
  const comments = await getRecentCommunityReviews(8);
  return <HomeCommentsSection initialComments={comments} />;
}

async function AdminUploadedMovies() {
  const movies = await getManualUploadedMovies(HOME_SECTION_LIMIT);
  if (!movies || movies.length === 0) return null;
  return <MovieSection title="Phim Admin Upload" movies={movies} priority={true} />;
}

async function LatestMovies() {
  const movies = await getMoviesByFilter('latest', HOME_SECTION_LIMIT);
  return <MovieSection title="Mới Cập Nhật" movies={movies} href="/phim-moi" priority={true} />;
}

async function TypeMovies({
  movieType,
  title,
}: {
  movieType: 'single' | 'series' | 'tvshows' | 'hoathinh';
  title: string;
}) {
  const movies = await getMoviesByType(movieType, HOME_SECTION_LIMIT);
  return <MovieSection title={title} movies={movies} />;
}

async function FeaturedFranchise({ franchise }: { franchise: FranchiseSlug }) {
  const movies = await getMoviesByFranchise(franchise, HOME_SECTION_LIMIT);
  return <FranchiseSection franchise={franchise} movies={movies} />;
}

async function PopularMovies() {
  const movies = await getMoviesByFilter('popular', HOME_SECTION_LIMIT);
  return <MovieSection title="Phổ Biến" movies={movies} href="/pho-bien" />;
}

async function RandomMovies() {
  const movies = await getRandomMovies(HOME_SECTION_LIMIT);
  if (!movies || movies.length === 0) return null;
  return <RandomMovieSection movies={movies} />;
}

async function RankingMovies() {
  const [topViewMovies, topImdbMovies] = await Promise.all([
    getTopViewMovies(HOME_SECTION_LIMIT),
    getTopImdbMovies(HOME_SECTION_LIMIT, 100), // Minimum 100 votes for quality
  ]);

  return (
    <RankingSection
      items={[
        { title: 'Top Lượt Xem', movies: topViewMovies, href: '/top-view' },
        { title: 'Top IMDb', movies: topImdbMovies, href: '/top-imdb' },
      ]}
    />
  );
}

async function Movies2026() {
  const movies = await getMoviesByYear(2026, HOME_SECTION_LIMIT);
  return <MovieSection title="Anime 2026" movies={movies} href="/nam/2026" />;
}

async function Movies2025() {
  const movies = await getMoviesByYear(2025, HOME_SECTION_LIMIT);
  return (
    <MovieSection title="Recap Anime 2025" movies={movies} href="/nam/2025" />
  );
}

async function ActionMovies() {
  const movies = await getMoviesByCategory('hanh-dong', HOME_SECTION_LIMIT);
  return (
    <HorizontalMovieSection
      title="Hành Động"
      movies={movies}
      href="/the-loai/hanh-dong"
    />
  );
}

async function AdventureMovies() {
  const movies = await getMoviesByCategory('phieu-luu', HOME_SECTION_LIMIT);
  return (
    <HorizontalMovieSection
      title="Phiêu Lưu"
      movies={movies}
      href="/the-loai/phieu-luu"
    />
  );
}

async function ComedyMovies() {
  const movies = await getMoviesByCategory('hai-huoc', HOME_SECTION_LIMIT);
  return (
    <HorizontalMovieSection
      title="Hài Hước"
      movies={movies}
      href="/the-loai/hai-huoc"
      desktopColumns={3}
    />
  );
}

async function CompletedMovies() {
  const movies = await getMoviesByFilter('completed', HOME_SECTION_LIMIT);
  return <MovieSection title="Hoàn Tất" movies={movies} href="/hoan-tat" />;
}

async function CountryMovies({ slug, title }: { slug: string; title: string }) {
  const movies = await getMoviesByCountry(slug, HOME_SECTION_LIMIT);
  return (
    <MovieSection title={title} movies={movies} href={`/quoc-gia/${slug}`} />
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-[#D4AF68] md:text-2xl">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(HOME_SECTION_LIMIT)].map((_, i) => (
          <div
            key={i}
            className="aspect-2/3 animate-pulse rounded-xl bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

function HorizontalSectionSkeleton({
  title,
  columns = 2,
}: {
  title: string;
  columns?: 2 | 3;
}) {
  const desktopColumnsClass = columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-[#D4AF68] md:text-2xl">
        {title}
      </h2>
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${desktopColumnsClass}`}>
        {[...Array(HOME_SECTION_LIMIT)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
