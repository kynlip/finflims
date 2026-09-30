import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Search,
  SlidersHorizontal,
  UserRound,
  Zap,
} from 'lucide-react';
import {
  getFranchiseFacets,
  getMoviesByFranchise,
  getMoviesByFranchiseWithPagination,
  type FranchiseFilters,
} from '@/lib/data';
import {
  FRANCHISES,
  type FranchiseFormat,
  type FranchiseSlug,
} from '@/lib/franchises';
import { FranchiseMovieCard } from './FranchiseMovieCard';

interface FranchiseCatalogProps {
  franchise: FranchiseSlug;
  searchParams: Promise<{
    page?: string;
    format?: string;
    category?: string;
    character?: string;
  }>;
}

interface FilterState {
  format: FranchiseFormat;
  category: string;
  character: string;
}

interface FilterOption {
  key: string;
  label: string;
  patch: Partial<FilterState>;
}

function parseFormat(value?: string): FranchiseFormat {
  return value === 'movie' || value === 'series' ? value : 'all';
}

function buildFilterHref(
  franchise: FranchiseSlug,
  state: FilterState,
  patch: Partial<FilterState> = {},
) {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();

  if (next.format !== 'all') params.set('format', next.format);
  if (next.category) params.set('category', next.category);
  if (next.character) params.set('character', next.character);

  const query = params.toString();
  return `/${franchise}${query ? `?${query}` : ''}`;
}

function getFilterOptions(
  franchise: FranchiseSlug,
  facets: Awaited<ReturnType<typeof getFranchiseFacets>>,
): FilterOption[] {
  const options: FilterOption[] = [
    { key: 'all', label: 'Tất cả', patch: { format: 'all', category: '', character: '' } },
    {
      key: 'movie',
      label: franchise === 'conan' ? 'Movie chiếu rạp' : franchise === 'doraemon' ? 'Movie rạp dài tập' : 'Movie & Bản chiếu rạp',
      patch: { format: 'movie', category: '', character: '' },
    },
    { key: 'series', label: 'Series', patch: { format: 'series', category: '', character: '' } },
  ];

  for (const category of facets.categories.slice(0, 4)) {
    options.push({
      key: `category-${category.slug}`,
      label: category.name,
      patch: { format: 'all', category: category.slug, character: '' },
    });
  }

  return options;
}

function isFilterActive(option: FilterOption, state: FilterState) {
  if (option.key === 'all') {
    return state.format === 'all' && !state.category && !state.character;
  }
  if (option.key === 'movie') return state.format === 'movie';
  if (option.key === 'series') return state.format === 'series';
  return state.category === option.key.replace('category-', '');
}

function FranchisePagination({
  currentPage,
  totalPages,
  baseUrl,
  franchise,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  franchise: FranchiseSlug;
}) {
  if (totalPages <= 1) return null;

  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
  const isConan = franchise === 'conan';
  const isDoraemon = franchise === 'doraemon';
  const getPageUrl = (page: number) =>
    `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${page}`;

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Phân trang">
      {currentPage > 1 && (
        <Link
          href={getPageUrl(currentPage - 1)}
          className={`grid h-10 w-10 place-items-center rounded-full border transition-colors ${
            isConan
              ? 'border-[#ef6a65]/30 text-[#f0bd83] hover:bg-[#ef6a65]/15'
              : isDoraemon
                ? 'border-[#36d9ef]/30 text-[#7af4ff] hover:bg-[#36d9ef]/15'
                : 'border-[#ff4d4f]/30 text-[#ffa940] hover:bg-[#ff4d4f]/15'
          }`}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={getPageUrl(page)}
          aria-current={currentPage === page ? 'page' : undefined}
          className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-black transition-transform hover:scale-105 ${
            currentPage === page
              ? isConan
                ? 'border-[#ef6a65] bg-[#e95b68] text-white shadow-lg shadow-[#e95b68]/25'
                : isDoraemon
                  ? 'border-[#36d9ef] bg-[#1fc7e2] text-[#062331] shadow-lg shadow-[#1fc7e2]/25'
                  : 'border-[#ff4d4f] bg-[#ff4d4f] text-white shadow-lg shadow-[#ff4d4f]/25'
              : isConan
                ? 'border-white/10 bg-white/[0.035] text-white/65 hover:border-[#f0bd83]'
                : isDoraemon
                  ? 'border-[#36d9ef]/20 bg-[#0a3049] text-white/65 hover:border-[#7af4ff]'
                  : 'border-[#ff4d4f]/20 bg-[#251014] text-white/65 hover:border-[#ffa940]'
          }`}
        >
          {page}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link
          href={getPageUrl(currentPage + 1)}
          className={`grid h-10 w-10 place-items-center rounded-full border transition-colors ${
            isConan
              ? 'border-[#ef6a65]/30 text-[#f0bd83] hover:bg-[#ef6a65]/15'
              : isDoraemon
                ? 'border-[#36d9ef]/30 text-[#7af4ff] hover:bg-[#36d9ef]/15'
                : 'border-[#ff4d4f]/30 text-[#ffa940] hover:bg-[#ff4d4f]/15'
          }`}
          aria-label="Trang tiếp theo"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}

export async function FranchiseCatalog({
  franchise,
  searchParams,
}: FranchiseCatalogProps) {
  const collection = FRANCHISES[franchise];
  const params = await searchParams;
  const facets = await getFranchiseFacets(franchise);
  const category = facets.categories.some((item) => item.slug === params.category)
    ? params.category || ''
    : '';
  const character = facets.characters.some(
    (item) => item.slug === params.character,
  )
    ? params.character || ''
    : '';
  const state: FilterState = {
    format: parseFormat(params.format),
    category,
    character,
  };
  const currentPage = Math.max(1, Number(params.page) || 1);
  const filters: FranchiseFilters = {
    format: state.format === 'all' ? undefined : state.format,
    category: state.category || undefined,
    character: state.character || undefined,
  };

  const [{ movies, totalPages }, heroMovies] = await Promise.all([
    getMoviesByFranchiseWithPagination(franchise, currentPage, 24, filters),
    getMoviesByFranchise(franchise, 8),
  ]);
  const isConan = franchise === 'conan';
  const isDoraemon = franchise === 'doraemon';
  const bannerSrc = `/images/franchises/${franchise}_banner_hero.jpg`;
  const BrandIcon = isConan ? Search : isDoraemon ? Bell : Zap;
  const filterOptions = getFilterOptions(franchise, facets);
  const characterOptions =
    facets.characters.length > 0
      ? facets.characters
      : collection.characters.map((item) => ({ ...item, count: 0 }));

  return (
    <div
      className={`min-h-screen overflow-hidden pt-16 ${
        isConan
          ? 'bg-[#080e1a] text-[#fff5e8]'
          : isDoraemon
            ? 'bg-[#061827] text-[#eaffff]'
            : 'bg-[#080d1a] text-white'
      }`}
    >
      <main>
        <section
          id="franchise-library"
          className="scroll-mt-20"
          aria-labelledby={`${franchise}-library-title`}
        >
          <div className="mx-auto max-w-[1320px] px-4 pt-8 md:px-8 md:pt-12">
            <div
              className={`relative isolate -mx-4 overflow-hidden border-y px-4 py-8 md:-mx-8 md:px-8 md:py-12 ${
                isConan
                  ? 'border-[#ef6a65]/25'
                  : isDoraemon
                    ? 'border-[#36d9ef]/20'
                    : 'border-white/10'
              }`}
            >
              <Image
                src={bannerSrc}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1320px"
                className="object-cover object-center opacity-75 brightness-110 saturate-110"
              />
              <div
                className={`absolute inset-0 ${
                  isConan
                    ? 'bg-linear-to-r from-[#080e1a]/70 via-[#080e1a]/30 to-transparent'
                    : isDoraemon
                      ? 'bg-linear-to-r from-[#061827]/60 via-[#061827]/20 to-transparent'
                      : 'bg-linear-to-r from-[#080d1a]/85 via-[#080d1a]/40 to-transparent'
                }`}
              />
              <div
                className={`absolute inset-x-0 bottom-0 h-24 bg-linear-to-t ${
                  isConan
                    ? 'from-[#080e1a]/70 to-transparent'
                    : isDoraemon
                      ? 'from-[#061827]/60 to-transparent'
                      : 'from-[#080d1a]/85 to-transparent'
                }`}
              />

              <div className="relative flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                        isConan
                          ? 'border-[#f0bd83]/60 bg-[#241923]/80 text-[#ffc996]'
                          : isDoraemon
                            ? 'border-[#7af4ff]/60 bg-[#073b58]/80 text-[#8af7ff]'
                            : 'border-white/15 bg-black/60 text-[#D4AF68]'
                      }`}
                    >
                      <BrandIcon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <p
                      className={`text-xs sm:text-sm font-bold tracking-wider uppercase ${
                        isConan
                          ? 'text-[#f0bd83]'
                          : isDoraemon
                            ? 'text-[#7af4ff]'
                            : 'text-[#D4AF68]'
                      }`}
                    >
                      {collection.subtitle}
                    </p>
                  </div>
                  <p
                    className={`mb-2 text-xs sm:text-sm font-bold tracking-wider uppercase ${
                      isConan
                        ? 'text-[#f0bd83]'
                        : isDoraemon
                          ? 'text-[#7af4ff]'
                          : 'text-[#D4AF68]'
                    }`}
                  >
                    {isConan ? 'Case files' : isDoraemon ? 'Pocket archive' : 'Hero archive'}
                  </p>
                  <h1
                    id={`${franchise}-library-title`}
                    className="text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl"
                  >
                    {collection.displayName}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                    {collection.sectionDescription}
                  </p>
                </div>
                <Clapperboard
                  className={`hidden h-6 w-6 sm:block ${
                    isConan ? 'text-[#f0bd83]' : isDoraemon ? 'text-[#7af4ff]' : 'text-[#D4AF68]'
                  }`}
                />
              </div>
            </div>

            <div
              className={`border-y py-4 ${
                isConan ? 'border-[#ef6a65]/20' : isDoraemon ? 'border-[#36d9ef]/20' : 'border-white/10'
              }`}
            >
              <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-white/60 uppercase">
                <SlidersHorizontal className="h-4 w-4" />
                Tuyến nội dung
              </div>
              <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
                {filterOptions.map((option) => {
                  const active = isFilterActive(option, state);
                  return (
                    <Link
                      key={option.key}
                      href={buildFilterHref(franchise, state, option.patch)}
                      aria-current={active ? 'page' : undefined}
                      className={`shrink-0 rounded-full border px-5 py-2.5 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                        active
                          ? isConan
                            ? 'border-[#ef6a65] bg-[#e95b68] text-white shadow-lg shadow-[#ef6a65]/15'
                            : isDoraemon
                              ? 'border-[#36d9ef] bg-[#1fc7e2] text-[#062331] shadow-lg shadow-[#1fc7e2]/15'
                              : 'border-[#D4AF68] bg-[#D4AF68] text-black shadow-lg shadow-[#D4AF68]/20'
                          : isConan
                            ? 'border-white/10 bg-white/[0.035] text-white/65 hover:border-[#f0bd83]/60 hover:text-[#fff0d3]'
                            : isDoraemon
                              ? 'border-[#36d9ef]/20 bg-[#0a3049]/65 text-white/65 hover:border-[#7af4ff] hover:text-[#eaffff]'
                              : 'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
                <Link
                  href="#franchise-library"
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-xs sm:text-sm font-bold transition-colors ${
                    isConan
                      ? 'border-[#f0bd83]/35 text-[#f0bd83] hover:bg-[#f0bd83]/10'
                      : isDoraemon
                        ? 'border-[#fbbf24]/40 text-[#fbbf24] hover:bg-[#fbbf24]/10'
                        : 'border-white/15 text-[#D4AF68] hover:bg-[#D4AF68]/10'
                  }`}
                >
                  Thư viện
                </Link>
              </div>
            </div>

            {characterOptions.length > 0 && (
              <div
                id="franchise-characters"
                className={`border-b py-4 ${
                  isConan ? 'border-[#ef6a65]/20' : isDoraemon ? 'border-[#36d9ef]/20' : 'border-white/10'
                }`}
              >
                <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-white/60 uppercase">
                  <UserRound className="h-4 w-4" />
                  Nhân vật yêu thích
                </div>
                <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
                  {characterOptions.map((item, index) => {
                    const active = state.character === item.slug;
                    const avatar = heroMovies[index % Math.max(heroMovies.length, 1)];
                    const avatarSrc = avatar?.poster_url || avatar?.thumb_url;
                    return (
                      <Link
                        key={item.slug}
                        href={buildFilterHref(franchise, state, {
                          character: active ? '' : item.slug,
                          category: '',
                        })}
                        aria-current={active ? 'page' : undefined}
                        className={`group inline-flex shrink-0 items-center gap-2.5 rounded-full border py-2 pr-4 pl-2 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                          active
                            ? isConan
                              ? 'border-[#f0bd83] bg-[#f0bd83]/15 text-[#fff0d3]'
                              : isDoraemon
                                ? 'border-[#7af4ff] bg-[#7af4ff]/15 text-[#eaffff]'
                                : 'border-[#D4AF68] bg-[#D4AF68]/15 text-[#D4AF68]'
                            : isConan
                              ? 'border-[#f0bd83]/25 bg-white/[0.03] text-white/70 hover:border-[#ef6a65]/70'
                              : isDoraemon
                                ? 'border-[#36d9ef]/25 bg-[#0a3049]/65 text-white/70 hover:border-[#7af4ff]'
                                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span
                          className={`relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border text-xs font-black ${
                            isConan
                              ? 'border-[#f0bd83]/50 bg-[#321d2a] text-[#ffe0a9]'
                              : isDoraemon
                                ? 'border-[#7af4ff]/60 bg-[#07527a] text-[#c8fcff]'
                                : 'border-white/15 bg-white/10 text-white'
                          }`}
                        >
                          {avatarSrc ? (
                            <Image
                              src={avatarSrc}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          ) : (
                            item.label.slice(0, 1)
                          )}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-[1320px] px-4 pt-6 pb-16 md:px-8 md:pt-8">
            {movies.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-9 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {movies.map((movie, index) => (
                    <FranchiseMovieCard
                      key={movie._id}
                      movie={movie}
                      franchise={franchise}
                      priority={currentPage === 1 && index < 6}
                    />
                  ))}
                </div>
                <FranchisePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={buildFilterHref(franchise, state)}
                  franchise={franchise}
                />
              </>
            ) : (
              <div
                className={`flex flex-col items-center justify-center border border-dashed px-6 py-20 text-center ${
                  isConan
                    ? 'border-[#ef6a65]/35 bg-[#111824]'
                    : 'border-[#36d9ef]/35 bg-[#0a3049]/45'
                }`}
              >
                <Clapperboard
                  className={`mb-4 h-10 w-10 ${
                    isConan ? 'text-[#f0bd83]' : 'text-[#7af4ff]'
                  }`}
                />
                <h3 className="mb-2 text-xl font-bold text-white">
                  Chưa có hồ sơ phù hợp
                </h3>
                <p className="max-w-md text-sm leading-6 text-white/55">
                  Bộ lọc này chưa có dữ liệu trong kho hiện tại. Hãy trở lại danh sách chính để xem các phim khác.
                </p>
                <Link
                  href={`/${franchise}`}
                  className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black ${
                    isConan
                      ? 'border-[#f0bd83]/40 text-[#ffe0a9] hover:bg-[#f0bd83]/10'
                      : 'border-[#7af4ff]/40 text-[#b9fbff] hover:bg-[#7af4ff]/10'
                  }`}
                >
                  Xóa bộ lọc
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
